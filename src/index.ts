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

import * as CometaCore from './cometa';
import * as CometaModule from './module';
import * as Encoding from './encoding';
import * as GarbageCollection from './garbageCollection';
import * as TxBuilder from './txBuilder';

export const Cometa = {
  Encoding,
  GarbageCollection,
  TxBuilder,
  ...CometaModule,
  ...CometaCore
};