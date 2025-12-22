/* eslint-disable complexity, max-statements, sonarjs/cognitive-complexity, max-depth */
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

/* IMPORTS *******************************************************************/

import { SlotConfig } from '../common/SlotConfig';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Marshal the SlotConfig object into a C struct (cardano_slot_config_t).
 * * Memory Layout:
 * [0-7]   zero_time (uint64_t)
 * [8-15]  zero_slot (uint64_t)
 * [16-23] slot_length (uint64_t)
 */
export const writeSlotConfig = (config: SlotConfig): number => {
  const SIZE = 24;
  const ptr = getModule()._malloc(SIZE);

  const dataView = new DataView(getModule().HEAPU8.buffer);

  dataView.setBigUint64(ptr, config.zeroTime, true);
  dataView.setBigUint64(ptr + 8, config.zeroSlot, true);
  dataView.setBigUint64(ptr + 16, config.slotLength, true);

  return ptr;
};
