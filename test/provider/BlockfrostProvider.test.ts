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
import { Provider } from '../util/Provider';

/* TESTS **********************************************************************/

describe('BlockfrostProvider', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('should create an instance', async () => {
    const provider = new Cometa.BlockfrostProvider({
      network: Cometa.NetworkMagic.PREPROD,
      projectId: ''
    });

    const provi = Provider.fromPtr(provider.providerPtr);
    expect(provi.name()).toBe('ss');
    const utxos = await provi.getUnspentOutputs(
      'addr_test1qq6arzxkm7zt9n9nxun07p6aj845eymdmkurz46g5gtx6qu0hgrdvrt3ahq80nz7hju0lqsn0tauu6xlnqn3jzfnydyq00jt6v'
    );

    expect(utxos).toBe([]);
  });
});
