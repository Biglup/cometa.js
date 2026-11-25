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

import { ProviderTimeoutError } from './Http';

/* DEFINITIONS ****************************************************************/

/** @internal Poll within one monotonic deadline, preserving all non-timeout failures. */
export const confirm = async (
  timeout: number,
  interval: number,
  query: (remaining: number) => Promise<boolean>
): Promise<boolean> => {
  if (!Number.isSafeInteger(timeout) || timeout < 0) throw new Error('Invalid confirmation timeout');
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    try {
      if (await query(deadline - performance.now())) return performance.now() < deadline;
    } catch (error) {
      if (error instanceof ProviderTimeoutError && performance.now() >= deadline) return false;
      throw error;
    }
    const delay = Math.min(interval, deadline - performance.now());
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return false;
};
