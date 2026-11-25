/**
 * Copyright 2026 Biglup Labs.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as C from '../../dist/cjs';
import { readFileSync } from 'fs';
import path from 'path';

const parameters = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/ogmios-parameters.json'), 'utf8')).result;
const utxos = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/koios-utxos.json'), 'utf8'));
const address = utxos[0].address;
const tx = '84a3008001800200a0f5f6';
const txId = '11'.repeat(32);
const invalidResponse = 'Invalid provider response';
const stake = 'stake_test1uppy2gm2hqzkwc80em4mlat73j4jyqvzhclrvsu72g9xg4q2yweet';
const factories = [
  [
    'Koios',
    () =>
      new C.KoiosProvider({
        baseUrl: 'https://koios.test/api/v1',
        network: C.NetworkMagic.Preprod,
        pollIntervalMs: 1,
        token: 'private-key'
      })
  ],
  [
    'Kupmios',
    () =>
      new C.KupmiosProvider({
        kupoUrl: 'https://kupo.test',
        network: C.NetworkMagic.Preprod,
        ogmiosUrl: 'https://ogmios.test/rpc?key=query-secret',
        pollIntervalMs: 1
      })
  ]
] as const;

const jsonResponse = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), { status });
const rpcResponse = (options: RequestInit | undefined, result: unknown): Response => {
  const request = JSON.parse(String(options?.body));
  return jsonResponse({ id: request.id, jsonrpc: '2.0', method: request.method, result });
};
describe('additional providers', () => {
  beforeAll(async () => C.ready());
  afterEach(() => jest.restoreAllMocks());

  describe.each(factories)('%s', (name, create) => {
    test('decodes a complete live preprod protocol snapshot', async () => {
      jest.spyOn(globalThis, 'fetch').mockImplementation(async (_, options) => rpcResponse(options, parameters));
      const provider = create();
      const result = await provider.getParameters();
      expect(provider.getName()).toBe(name);
      expect(provider.getNetworkMagic()).toBe(C.NetworkMagic.Preprod);
      expect(result.adaPerUtxoByte).toBe(4310);
      expect(result.protocolVersion).toEqual({ major: 11, minor: 0 });
      expect(result.drepVotingThresholds.ppGovernanceGroup).toEqual({ denominator: 4, numerator: 3 });
      expect(result.executionCosts.steps).toEqual({ denominator: 10000000, numerator: 721 });
      expect(result.refScriptCostStride).toBe(25600);
      expect(result.costModels.map((model) => model.costs.length)).toEqual([332, 332, 350]);
    });

    test.each([401, 403, 429, 500])('propagates HTTP %s without retrying or leaking credentials', async (status) => {
      const fetch = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(jsonResponse({ message: 'private-key query-secret' }, status));
      await expect(create().getParameters()).rejects.toThrow(`Provider HTTP status ${status}`);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('zero confirmation timeout makes no HTTP request', async () => {
      const fetch = jest.spyOn(globalThis, 'fetch');
      await expect(create().confirmTransaction(txId, 0)).resolves.toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('rejects a mismatched transaction ID after one submission', async () => {
      const fetch = jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (_, options) => rpcResponse(options, { transaction: { id: txId } }));
      await expect(create().submitTransaction(tx)).rejects.toThrow(invalidResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('rejects an unexpected evaluation budget', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (_, options) =>
          rpcResponse(options, [{ budget: { cpu: 2, memory: 1 }, validator: { index: 0, purpose: 'spend' } }])
        );
      await expect(create().evaluateTransaction(tx)).rejects.toThrow(invalidResponse);
    });
  });

  test('Koios retains native JSON and Plutus reference scripts from live UTxOs', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(utxos));
    const provider = new C.KoiosProvider({ network: C.NetworkMagic.Preprod });
    const result = await provider.getUnspentOutputs(address);
    expect(result).toHaveLength(utxos.length);
    const references = result.filter((value) => value.output.scriptReference);
    expect(references).toHaveLength(3);
    for (const output of references) {
      const source = utxos.find(
        (value: any) => value.tx_hash === output.input.txId && value.tx_index === output.input.index
      );
      expect(C.computeScriptHash(output.output.scriptReference!)).toBe(source.reference_script.hash);
    }
  });

  test('Koios does not round lovelace above Number.MAX_SAFE_INTEGER', async () => {
    const row = { ...utxos[0], asset_list: [], value: '9007199254740993' };
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([row]).replace('"9007199254740993"', '9007199254740993')));
    const result = await new C.KoiosProvider({ network: C.NetworkMagic.Preprod }).getUnspentOutputs(address);
    expect(result[0].output.value.coins).toBe(9007199254740993n);
  });

  test('Koios resolution removes spent outputs and preserves requested order', async () => {
    const rows = [{ ...utxos[0], is_spent: true }, utxos[1], utxos[2]];
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(rows));
    const requested = [rows[2], rows[0], rows[1]].map((row) => ({ index: row.tx_index, txId: row.tx_hash }));
    const result = await new C.KoiosProvider({ network: C.NetworkMagic.Preprod }).resolveUnspentOutputs(requested);
    expect(result.map((value) => value.input)).toEqual([requested[0], requested[2]]);
  });

  test('Kupmios preserves dotted asset IDs, empty asset names and quantities', async () => {
    const policy = '22'.repeat(28);
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          `[{"transaction_id":"${txId}","output_index":0,"address":"${address}","value":{"coins":9007199254740993,"assets":{"${policy}":1,"${policy}.ff":2}},"datum_hash":null,"script_hash":null,"spent_at":null}]`
        )
      );
    const provider = new C.KupmiosProvider({
      kupoUrl: 'https://kupo.test',
      network: C.NetworkMagic.Preprod,
      ogmiosUrl: 'https://ogmios.test'
    });
    const result = await provider.getUnspentOutputs(address);
    expect(result[0].output.value).toEqual({ assets: { [policy]: 1n, [`${policy}ff`]: 2n }, coins: 9007199254740993n });
  });

  test('Ogmios rejects JSON-RPC errors and mismatched response IDs', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockImplementation(async (_, options) => {
      const request = JSON.parse(String(options?.body));
      return jsonResponse({ error: { code: 1, message: 'private-key' }, id: request.id, jsonrpc: '2.0' });
    });
    const provider = new C.KoiosProvider({ network: C.NetworkMagic.Preprod });
    await expect(provider.getParameters()).rejects.toThrow('Ogmios rejected the request');
    fetch.mockResolvedValue(jsonResponse({ id: 'wrong', jsonrpc: '2.0', result: parameters }));
    await expect(provider.getParameters()).rejects.toThrow(invalidResponse);
  });
});

const createHydra = () =>
  new C.HydraProvider({ baseUrl: 'https://hydra.test', network: C.NetworkMagic.Preprod, pollIntervalMs: 1 });

describe('Hydra', () => {
  const hydraParameters = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/hydra-parameters.json'), 'utf8'));
  const hydraUtxos = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/hydra-utxos.json'), 'utf8'));
  beforeAll(async () => C.ready());
  afterEach(() => jest.restoreAllMocks());

  test('uses actual Head parameters including zero fees and execution prices', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(hydraParameters));
    const headParameters = await createHydra().getParameters();
    expect(headParameters.minFeeA).toBe(0);
    expect(headParameters.minFeeB).toBe(0);
    expect(headParameters.adaPerUtxoByte).toBe(4310);
    expect(headParameters.maxTxSize).toBe(10250);
    expect(headParameters.executionCosts.memory).toEqual({ denominator: 1, numerator: 0 });
    expect(headParameters.poolPledgeInfluence).toEqual({ denominator: 10, numerator: 3 });
    expect(headParameters.drepVotingThresholds.ppGovernanceGroup).toEqual({ denominator: 4, numerator: 3 });
  });

  test('preserves upstream native scripts, Plutus scripts, inline datum and exact amounts', async () => {
    const bytes = readFileSync(path.join(__dirname, 'fixtures/hydra-utxos.json'), 'utf8');
    jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(bytes));
    const provider = createHydra();
    for (const row of Object.values(hydraUtxos) as any[]) {
      const outputs = await provider.getUnspentOutputs(row.address);
      expect(outputs).toHaveLength(1);
      expect(outputs[0].output.scriptReference).toBeDefined();
      if (row.inlineDatumRaw) expect(C.plutusDataToCbor(outputs[0].output.datum!)).toBe(row.inlineDatumRaw);
    }
    const first = Object.values(hydraUtxos)[0] as any;
    const outputs = await provider.getUnspentOutputs(first.address);
    expect(outputs[0].output.value.coins).toBe(3797645294248714119n);
  });

  test('rejects an inline datum hash without its CBOR', async () => {
    const [key, original] = Object.entries(hydraUtxos)[0] as [string, Record<string, unknown>];
    const row = { ...original, inlineDatumRaw: null, inlineDatumhash: '11'.repeat(32) };
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ [key]: row }));
    await expect(createHydra().getUnspentOutputs(String(original.address))).rejects.toThrow();
  });

  test('submits exact transaction CBOR to L2 and accepts an unconfirmed acknowledgement', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ tag: 'SubmitTxSubmitted' }, 202));
    const result = await createHydra().submitTransaction(tx);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
    expect(fetch.mock.calls[0][0]).toBe('https://hydra.test/transaction');
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      cborHex: tx,
      description: '',
      type: 'Tx ConwayEra'
    });
  });

  test('confirmation uses transaction records, not L1 deposit outputs', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse({ initialUTxO: { [`${txId}#0`]: {} }, tag: 'InitialSnapshot' }));
    await expect(createHydra().confirmTransaction(txId, 5)).resolves.toBe(false);
    expect(fetch.mock.calls[0][0]).toBe('https://hydra.test/snapshot');
  });

  test('rejects forged transaction IDs in snapshot records', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ snapshot: { confirmed: [{ cborHex: tx, txId }], number: 1 }, tag: 'ConfirmedSnapshot' })
      );
    await expect(createHydra().confirmTransaction(txId, 1000)).rejects.toThrow(invalidResponse);
  });

  test('fails explicitly for rewards and remote evaluation without HTTP', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    await expect(createHydra().getRewardsBalance(stake)).rejects.toThrow('staking rewards');
    await expect(createHydra().evaluateTransaction(tx)).rejects.toThrow('no remote evaluation');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe.each(factories)('%s evaluation contracts', (_name, create) => {
  const scriptTx = '84a3008001800200a1058184000000820000f5f6';
  const budget = { budget: { cpu: 29, memory: 17 }, validator: { index: 0, purpose: 'spend' } };
  beforeAll(async () => C.ready());
  afterEach(() => jest.restoreAllMocks());

  test('applies complete budgets without changing the redeemer argument', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_, options) => rpcResponse(options, [budget]));
    await expect(create().evaluateTransaction(scriptTx)).resolves.toEqual([
      { data: 0n, executionUnits: { memory: 17, steps: 29 }, index: 0, purpose: C.RedeemerPurpose.spend }
    ]);
  });

  test.each([{ response: [] }, { response: [budget, budget] }])(
    'rejects missing or repeated budget identities',
    async ({ response }) => {
      jest.spyOn(globalThis, 'fetch').mockImplementation(async (_, options) => rpcResponse(options, response));
      await expect(create().evaluateTransaction(scriptTx)).rejects.toThrow(invalidResponse);
    }
  );

  test('additional UTxOs preserve quantities and use Ogmios v6 flat objects', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_, options) => rpcResponse(options, [budget]));
    const additional = { input: { index: 1, txId }, output: { address, value: { coins: 9007199254740993n } } };
    await create().evaluateTransaction(scriptTx, [additional]);
    const body = String(fetch.mock.calls[0][1]?.body);
    expect(body).toContain('9007199254740993');
    const payload = JSON.parse(body).params.additionalUtxo[0];
    expect(payload.transaction).toEqual({ id: txId });
    expect(payload.index).toBe(1);
    expect(payload.address).toBe(address);
  });

  test('invalid JSON numeric keys are not repaired by lossless parsing', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{123:0}'));
    await expect(create().getParameters()).rejects.toThrow('Invalid provider JSON response');
  });
});
