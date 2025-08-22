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

/* IMPORTS ********************************************************************/

import * as Cometa from '../../dist/cjs';

/* TESTS **********************************************************************/

const GOV_ID_BECH_32 = 'gov_action1u8gafgcskj6sqvgwqse7adc0h9438m535lg97czcvxntscvw7f5sqgf2n7j';
const GOV_ID_OBJ: Cometa.GovernanceActionId = {
  actionIndex: 0,
  id: 'e1d1d4a310b4b500310e0433eeb70fb96b13ee91a7d05f605861a6b8618ef269'
};

// eslint-disable-next-line max-statements
describe('Voting', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('Convert', () => {
    it('should convert a Bech32 governance action ID to an object', () => {
      expect(Cometa.govActionIdFromBech32(GOV_ID_BECH_32)).toEqual(GOV_ID_OBJ);
    });

    it('should convert a governance action ID object to Bech32', () => {
      expect(Cometa.govActionIdToBech32(GOV_ID_OBJ)).toEqual(GOV_ID_BECH_32);
    });
  });
});
