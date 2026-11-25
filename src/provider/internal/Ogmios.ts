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

/* IMPORTS ********************************************************************/

import { Http } from './Http';
import { invalid, object } from './Values';

/* DEFINITIONS ****************************************************************/

/** @internal Stateless Ogmios v6 JSON-RPC over HTTP, with response correlation. */
export class Ogmios {
  private nextId = 0;

  constructor(private readonly http: Http, private readonly path: string[] = []) {}

  async call(method: string, params: unknown = {}): Promise<unknown> {
    const id = `cometa-${++this.nextId}`;
    const response = object(await this.http.json(this.path, {}, { id, jsonrpc: '2.0', method, params }));
    if (
      response.jsonrpc !== '2.0' ||
      response.id !== id ||
      (response.method !== undefined && response.method !== method)
    )
      return invalid();
    if ('error' in response) throw new Error('Ogmios rejected the request');
    if (!('result' in response)) return invalid();
    return response.result;
  }
}
