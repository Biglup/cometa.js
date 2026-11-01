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

import * as C from '../../dist/cjs';

/* TESTS *********************************************************************/

const baseUrl = 'http://127.0.0.1:8080/api/v0';
const routes: [string, (provider: C.BlockfrostProvider) => Promise<unknown>][] = [
  ['epochs/latest/parameters', (provider) => provider.getParameters()],
  ['accounts/stake_test', (provider) => provider.getRewardsBalance('stake_test')],
  ['addresses/addr_test/utxos?count=100&page=1', (provider) => provider.getUnspentOutputs('addr_test')],
  [
    'addresses/addr_test/utxos/asset?count=100&page=1',
    (provider) => provider.getUnspentOutputsWithAsset('addr_test', 'asset')
  ],
  ['assets/asset/addresses', (provider) => provider.getUnspentOutputByNft('asset')],
  ['txs/tx/utxos', (provider) => provider.resolveUnspentOutputs([{ txId: 'tx', index: 0 }])],
  ['scripts/datum/hash/cbor', (provider) => provider.resolveDatum('hash')],
  ['txs/tx/metadata/cbor', (provider) => provider.confirmTransaction('tx')],
  ['tx/submit', (provider) => provider.submitTransaction('00')],
  ['utils/txs/evaluate/utxos', (provider) => provider.evaluateTransaction('84a3008001800200a0f5f6')]
];

describe('Blockfrost-compatible endpoints', () => {
  beforeAll(async () => C.ready());
  afterEach(() => jest.restoreAllMocks());

  describe.each(['', '/', '///'])('base URL suffix %s', (suffix) => {
    test.each(routes)('joins %s without doubled slashes', async (route, request) => {
      const stopped = new Error('request captured');
      const fetch = jest.spyOn(globalThis, 'fetch').mockRejectedValue(stopped);
      const provider = new C.BlockfrostProvider({ network: C.NetworkMagic.Preprod, baseUrl: baseUrl + suffix });
      await expect(request(provider)).rejects.toThrow(stopped);
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe(`${baseUrl}/${route}`);
      expect(new Headers(options?.headers).has('project_id')).toBe(false);
    });
  });

  test.each(['', 'project-key'])('handles project ID %s on GET and POST', async (projectId) => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => []
    } as Response);
    const provider = new C.BlockfrostProvider({ network: C.NetworkMagic.Preprod, projectId });
    await provider.getUnspentOutputs('addr_test');
    await provider.submitTransaction('00');
    for (const [url, options] of fetch.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/cardano-preprod\.blockfrost\.io\/api\/v0\/[^/]/);
      expect(new Headers(options?.headers).get('project_id')).toBe(projectId || null);
    }
    expect(new Headers(fetch.mock.calls[1][1]?.headers).get('Content-Type')).toBe('application/cbor');
  });

  test.each(['timelock', 'plutusV3'])('joins reference-script routes for %s', async (type) => {
    const stopped = new Error('script request captured');
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ reference_script_hash: 'hash' }]
      } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ type }) } as Response)
      .mockRejectedValue(stopped);
    const provider = new C.BlockfrostProvider({ network: C.NetworkMagic.Preprod, baseUrl });
    await expect(provider.getUnspentOutputs('addr_test')).rejects.toThrow(stopped);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      `${baseUrl}/addresses/addr_test/utxos?count=100&page=1`,
      `${baseUrl}/scripts/hash`,
      `${baseUrl}/scripts/hash/${type === 'timelock' ? 'json' : 'cbor'}`
    ]);
  });
});
