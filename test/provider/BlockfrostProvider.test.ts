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

describe('BlockfrostProvider', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('should create an instance', async () => {
    const provider = new Cometa.BlockfrostProvider({
      network: Cometa.NetworkMagic.PREPROD,
      projectId: 'preprodeMB9jfka6qXsluxEhPLhKczRdaC5QKab'
    });

    const provi = Cometa.Provider.fromPtr(provider.providerPtr);
    const params = await provi.getUnspentOutputs(
      'addr_test1qrwyxh7zvw8kdp9ar70klytasryj4ejz5j3n5sfw29j8nejzg53k4wq9vaswlnhthl6har9tygqc9037xepeu5s2v32qn6lwrx'
    );
    expect(params).toEqual({});
  });
});
