/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* DEFINITIONS ****************************************************************/

/**
 * An anchor is a pair of:
 *
 * - a URL to a JSON payload of metadata.
 * - a hash of the contents of the metadata URL.
 *
 * The on-chain rules will not check either the URL or the hash. Client applications should,
 * however, perform the usual sanity checks when fetching content from the provided URL.
 */
export interface Anchor {
  dataHash: string;
  url: string;
}
