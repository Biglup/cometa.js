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

/* IMPORTS ********************************************************************/

import * as Cometa from '../../dist/cjs';

/* TESTS **********************************************************************/

import { params } from '../util/protocolParameters';

const address =
  'addr_test1zrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gten0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgsxj90mg';
const utxo: Cometa.UTxO = {
  input: { index: 0, txId: '01'.repeat(32) },
  output: { address, value: { coins: 100000000n } }
};

describe('Release candidate transaction building', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it.each(['native', 'legacy', 'explicit'])('builds with %s coin selection', async (mode) => {
    const builder = Cometa.TransactionBuilder.create({ params, slotConfig: Cometa.CARDANO_PREVIEW_SLOT_CONFIG });
    const select = jest.fn(async (request: Cometa.CoinSelectorParams): Promise<Cometa.CoinSelectorResult> => {
      expect(request.changeAddress).toBe(address);
      expect(request.coinsPerUtxoByte).toBe(4310);
      expect(request.outputsToCover).toEqual([{ address, value: { coins: 2000000n } }]);
      const result: Cometa.CoinSelectorResult = { remaining: [], selection: [utxo] };
      if (mode === 'explicit') {
        result.changeOutputs = [{ address, value: { coins: utxo.output.value.coins - request.targetValue.coins } }];
      }
      return result;
    });
    if (mode !== 'native') builder.setCoinSelector({ getName: () => 'test selector', select });
    const cbor = await builder
      .setChangeAddress(address)
      .setUtxos([utxo])
      .sendLovelace({ address, amount: 2000000n })
      .build();
    const ptr = Cometa.readTransactionFromCbor(cbor);
    try {
      expect(Cometa.writeTransactionToCbor(ptr)).toBe(cbor);
      if (mode !== 'native') expect(select).toHaveBeenCalled();
    } finally {
      Cometa.unrefObject(ptr);
      builder.dispose();
    }
  });

  it('round-trips empty and multiple change outputs through the bridge', () => {
    for (const outputs of [[], [utxo.output, { address, datum: 42n, value: { coins: 3000000n } }]]) {
      const ptr = Cometa.bridgeCallbacks.marshal_transaction_output_list(outputs);
      try {
        expect(Cometa.bridgeCallbacks.marshall_transaction_output_list_to_js(ptr)).toEqual(outputs);
      } finally {
        Cometa.unrefObject(ptr);
      }
    }
  });
});
