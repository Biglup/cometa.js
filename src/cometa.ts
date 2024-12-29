/**
 * Copyright 2024 Biglup Labs.
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

/* IMPORTS *******************************************************************/

import { getModule } from './module';

/* DEFINITIONS ****************************************************************/

/**
 * Retrieves the version of the underlying libcardano-c library.
 *
 * This function calls the WASM module's `get_lib_version` method to fetch the library version
 * as a UTF-8 encoded string. The version string can be used for debugging, compatibility checks,
 * or informational purposes.
 *
 * @returns {string} The version string of the libcardano-c library.
 */
export const getLibCardanoCVersion = (): string => getModule().UTF8ToString(getModule().get_lib_version());
