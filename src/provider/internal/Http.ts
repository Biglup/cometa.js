/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* DEFINITIONS ****************************************************************/

const JSON_MEDIA_TYPE = 'application/json';

/** @internal A whole-request deadline expired. */
export class ProviderTimeoutError extends Error {
  constructor() {
    super('Provider request timed out');
  }
}

/** @internal Bound streamed response bodies before decoding UTF-8. */
const readResponse = async (response: Response): Promise<string> => {
  if (!response.body) throw new Error('Missing response body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 8 * 1024 * 1024) throw new Error('Provider response exceeds 8 MiB');
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

/** @internal A status-only error; remote bodies and credentials are never included. */
export class ProviderHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Provider HTTP status ${status}`);
  }
}

/** @internal Preserve JSON numeric tokens before JavaScript can round them. */
export const parseJson = (text: string): unknown => {
  const tokens = /"(?:[^"\\]|\\.)*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  JSON.parse(text); // Validate syntax before quoting numeric tokens.
  return JSON.parse(text.replace(tokens, (token) => (token.startsWith('"') ? token : JSON.stringify(token))));
};

/** @internal Encode bigint quantities as exact JSON numbers. */
export const encodeJson = (value: unknown): string => {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return `[${value.map(encodeJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const properties = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => `${JSON.stringify(key)}:${encodeJson(item)}`)
      .join(',');
    return `{${properties}}`;
  }
  const result = JSON.stringify(value);
  if (result === undefined || (typeof value === 'number' && !Number.isFinite(value)))
    throw new Error('Invalid JSON value');
  return result;
};

/** @internal Validate an endpoint without exposing its credentials in errors. */
export const endpoint = (value: string): URL => {
  try {
    const result = new URL(value);
    if (!['https:', 'http:'].includes(result.protocol) || result.username || result.password || result.hash)
      throw new Error('Invalid endpoint');
    return result;
  } catch {
    throw new Error('Provider endpoint must be an HTTP(S) URL without user information or a fragment');
  }
};

/** @internal Header credentials must not contain control characters. */
export const credential = (value: string): string => {
  if (
    !value ||
    value.length > 4096 ||
    [...value].some((character) => character.charCodeAt(0) < 33 || character.charCodeAt(0) > 126)
  )
    throw new Error('Invalid provider credential');
  return value;
};

/** @internal Bounded HTTP client with no redirects or automatic submission retries. */
export class Http {
  private readonly base: URL;

  constructor(
    baseUrl: string,
    private readonly headers: Record<string, string> = {},
    private readonly timeout = 30_000
  ) {
    this.base = endpoint(baseUrl);
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000)
      throw new Error('HTTP timeout must be 1 through 60000 milliseconds');
  }

  async request(
    path: string[],
    query: Record<string, string> = {},
    body?: string | Uint8Array,
    contentType = JSON_MEDIA_TYPE,
    timeout = this.timeout
  ): Promise<{ status: number; text: string }> {
    const url = new URL(this.base.toString());
    if (path.length > 0) url.pathname = `${url.pathname.replace(/\/+$/, '')}/${path.map(encodeURIComponent).join('/')}`;
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(timeout, this.timeout)));
    try {
      const response = await fetch(url.toString(), {
        body,
        headers: {
          Accept: JSON_MEDIA_TYPE,
          ...this.headers,
          ...(body === undefined ? {} : { 'Content-Type': contentType })
        },
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        signal: controller.signal
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProviderHttpError(response.status);
      }
      return { status: response.status, text: await readResponse(response) };
    } catch (error) {
      if (error instanceof ProviderHttpError) throw error;
      if (controller.signal.aborted) throw new ProviderTimeoutError();
      throw new Error('Provider transport failed');
    } finally {
      clearTimeout(timer);
    }
  }

  async json(path: string[], query: Record<string, string> = {}, body?: unknown, timeout?: number): Promise<unknown> {
    return (await this.jsonResponse(path, query, body, timeout)).value;
  }

  /** Decode JSON while retaining status for protocols with distinct success states. */
  async jsonResponse(
    path: string[],
    query: Record<string, string> = {},
    body?: unknown,
    timeout?: number
  ): Promise<{ status: number; value: unknown }> {
    const response = await this.request(
      path,
      query,
      body === undefined ? undefined : encodeJson(body),
      JSON_MEDIA_TYPE,
      timeout
    );
    try {
      return { status: response.status, value: parseJson(response.text) };
    } catch {
      throw new Error('Invalid provider JSON response');
    }
  }
}
