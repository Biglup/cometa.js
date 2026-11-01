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
import { MemoryLeakDetector } from '../util/memory';
import { plutusV4Costs } from '../util/plutusV4CostModel';
import { params } from '../util/protocolParameters';

/* TESTS **********************************************************************/

const dijkstra = {
  ...params,
  protocolVersion: { major: 12, minor: 0 },
  costModels: [{ language: 'PlutusV4', costs: plutusV4Costs }],
  maxTxExUnits: { memory: 14000000, steps: 10000000000 }
};
const guard: C.Credential = { hash: '11'.repeat(28), type: C.CredentialType.KeyHash };
const script: C.PlutusScript = {
  type: C.ScriptType.Plutus,
  version: C.PlutusLanguageVersion.V4,
  bytes: '450100002499'
};
let address: string;
let rewardAddress: string;
let detector: MemoryLeakDetector;
const makeSub = () => C.SubTransactionBuilder.create({ params: dijkstra, slotConfig: C.CARDANO_PREVIEW_SLOT_CONFIG });
const makeMain = () => C.TransactionBuilder.create({ params: dijkstra, slotConfig: C.CARDANO_PREVIEW_SLOT_CONFIG });
const input = (): C.UTxO => ({
  input: { index: 0, txId: '01'.repeat(32) },
  output: { address, value: { coins: 100000000n } }
});

describe('Dijkstra bindings', () => {
  beforeAll(async () => {
    await Promise.all([C.ready(), C.ready(), C.ready()]);
    address = C.EnterpriseAddress.fromCredentials(C.NetworkId.Testnet, guard).toAddress().toString();
    rewardAddress = C.RewardAddress.fromCredentials(C.NetworkId.Testnet, guard).toBech32();
  });
  beforeEach(async () => {
    detector = new MemoryLeakDetector(C.getModule());
    await detector.start();
  });
  afterEach(async () => {
    await detector.stop();
    detector.detect();
  });

  it('round-trips Plutus V4 and both guard credential kinds', () => {
    const scripts: C.Script[] = [
      script,
      ...[C.CredentialType.KeyHash, C.CredentialType.ScriptHash].map((type) => ({
        type: C.ScriptType.Native as const,
        kind: C.NativeScriptKind.RequireGuard as const,
        credential: { ...guard, type }
      }))
    ];
    for (const value of scripts) {
      const ptr = C.writeScript(value);
      try {
        expect(C.readScript(ptr)).toEqual(value);
      } finally {
        C.unrefObject(ptr);
      }
      expect(C.cborToScript(C.scriptToCbor(value))).toEqual(value);
    }
  });

  it('round-trips guard redeemers and Plutus V4 cost models', () => {
    const redeemer: C.Redeemer = {
      purpose: C.RedeemerPurpose.guard,
      index: 0,
      data: 0n,
      executionUnits: { memory: 1, steps: 2 }
    };
    const ptr = C.writeRedeemer(redeemer);
    try {
      expect(C.readRedeemer(ptr)).toEqual(redeemer);
    } finally {
      C.unrefObject(ptr);
    }
    const model = { language: 'PlutusV4', costs: [1, 2, 3] };
    const costs = C.writeCostModels([model]);
    try {
      expect(C.readCostModels(costs).filter(Boolean)).toEqual([model]);
    } finally {
      C.unrefObject(costs);
    }
  });

  it.each<C.AccountBalanceInterval>([
    { exact: 0n },
    { exact: 0xffffffffffffffffn },
    { inclusiveLowerBound: 1n },
    { exclusiveUpperBound: 50n },
    { inclusiveLowerBound: 1n, exclusiveUpperBound: 50n }
  ])('round-trips account interval %p', (value) => {
    const ptr = C.writeAccountBalanceInterval(value);
    try {
      expect(C.readAccountBalanceInterval(ptr)).toEqual(value);
    } finally {
      C.unrefObject(ptr);
    }
  });

  it('rejects invalid account intervals without leaking', () => {
    expect(() => C.writeAccountBalanceInterval({ exact: -1n })).toThrow();
    expect(() => C.writeAccountBalanceInterval({ inclusiveLowerBound: 2n, exclusiveUpperBound: 1n })).toThrow();
  });

  it('builds a sub-transaction and includes it in a balanced batch', async () => {
    const sub = makeSub();
    const main = makeMain();
    try {
      const cbor = await sub
        .sendLovelace({ address, amount: 2000000n })
        .addGuard(guard)
        .requireTopLevelGuard(guard)
        .build();
      expect(C.getSubTransactionId(cbor)).toMatch(/^[0-9a-f]{64}$/);
      expect(C.getSubTransactionId(C.applySubTransactionWitnesses(cbor, []))).toBe(C.getSubTransactionId(cbor));
      const batch = await main
        .setUtxos([input()])
        .setChangeAddress(address)
        .addGuard(guard)
        .addSubTransaction(cbor, [])
        .build();
      expect(C.inspectTx(batch)).toBeDefined();
    } finally {
      sub.dispose();
      main.dispose();
    }
  });

  it('builds direct deposits and both account-balance constraint forms', async () => {
    const builder = makeMain();
    try {
      const tx = await builder
        .setUtxos([input()])
        .setChangeAddress(address)
        .sendLovelace({ address, amount: 2000000n })
        .addDirectDeposit(rewardAddress, 1000000n)
        .addAccountBalanceInterval(rewardAddress, { inclusiveLowerBound: 0n, exclusiveUpperBound: 100000000n })
        .addStartingAccountBalanceInterval(rewardAddress, { exact: 0n })
        .build();
      expect(C.inspectTx(tx)).toBeDefined();
    } finally {
      builder.dispose();
    }
  });

  it.each([
    [false, 2000000n],
    [false, 0x100000007n],
    [true, 2000000n],
    [true, 0x100000007n]
  ])('preserves withdrawal amounts for string addresses (sub=%s, amount=%s)', async (sub, amount) => {
    const build = async (asString: boolean) => {
      const account = C.RewardAddress.fromBech32(rewardAddress);
      const builder = sub ? makeSub() : makeMain().setUtxos([input()]).setChangeAddress(address);
      try {
        return await builder
          .withdrawRewards({ rewardAddress: asString ? rewardAddress : account, amount: amount as bigint })
          .addDirectDeposit(rewardAddress, amount as bigint)
          .build();
      } finally {
        builder.dispose();
      }
    };
    expect(await build(true)).toBe(await build(false));
  });

  it('resolves a deferred zero redeemer and preserves callback errors', async () => {
    const builder = makeSub();
    const scriptInput = {
      ...input(),
      output: { address: C.getScriptAddress(script, C.NetworkId.Testnet).toString(), value: { coins: 100000000n } }
    };
    const callback = jest.fn((draft: string, inputs: C.UTxO[]) => {
      expect(C.inspectTx(draft)).toBeDefined();
      expect(inputs.map((item) => item.input)).toEqual([input().input]);
      return 0n;
    });
    try {
      await builder
        .addScript(script)
        .addInputWithDeferredRedeemer(scriptInput, callback)
        .sendLovelace({ address, amount: 2000000n })
        .build();
      expect(callback).toHaveBeenCalled();
    } finally {
      builder.dispose();
    }
    const failed = makeSub();
    try {
      failed.addScript(script).addInputWithDeferredRedeemer(scriptInput, () => {
        throw new Error('redeemer failed');
      });
      await expect(failed.build()).rejects.toThrow('redeemer failed');
    } finally {
      failed.dispose();
    }
  });

  it('releases builders repeatedly and rejects use after disposal', () => {
    for (let i = 0; i < 20; i++) {
      const builder = makeSub();
      builder.addGuard(guard).addInputWithDeferredRedeemer(input(), () => 0n);
      builder.dispose();
      builder.dispose();
      expect(() => builder.addGuard(guard)).toThrow('disposed');
    }
  });

  it('preserves wide protocol parameters and nullable proposals', () => {
    const update: C.ProtocolParametersUpdate = {
      governanceActionDeposit: 100000000000,
      maxRefScriptSizePerTx: 200000,
      refScriptCostStride: 25600,
      refScriptCostMultiplier: { numerator: 6, denominator: 5 },
      maxPledgeLeverage: null,
      perasBootstrapRound: null,
      leiosCommitteeSize: 100,
      maxEndorserBlockExecutionUnits: { memory: 1000, steps: 2000 }
    };
    const ptr = C.writeProtocolParamUpdate(update);
    try {
      expect(C.readProtocolParamUpdate(ptr)).toMatchObject(update);
    } finally {
      C.unrefObject(ptr);
    }
    const full = C.writeProtocolParameters({
      ...dijkstra,
      governanceActionDeposit: 100000000000,
      maxRefScriptSizePerTx: 200000
    });
    try {
      expect(C.readProtocolParameters(full)).toMatchObject({
        governanceActionDeposit: 100000000000,
        maxRefScriptSizePerTx: 200000
      });
    } finally {
      C.unrefObject(full);
    }
  });
  it('applies Plutus parameters using the native VM without leaking', () => {
    expect(C.applyParamsToScript(script, [])).toEqual(script);
    const applied = C.applyParamsToScript(script, [0n]);
    expect(applied.version).toBe(C.PlutusLanguageVersion.V4);
    expect(applied.bytes).not.toBe(script.bytes);
    expect(() => C.applyParamsToScript({ ...script, bytes: '00' }, [])).toThrow();
  });
  it.each(['mint', 'withdrawal', 'certificate', 'vote'])('resolves a deferred %s redeemer', async (purpose) => {
    const builder = makeSub();
    const callback = jest.fn(() => 0n);
    const credential = { hash: C.computeScriptHash(script), type: C.CredentialType.ScriptHash };
    try {
      builder.addScript(script);
      switch (purpose) {
        case 'mint':
          builder.mintTokenWithDeferredRedeemer(credential.hash + 'aa', 1n, callback);
          break;
        case 'withdrawal':
          builder.withdrawRewardsWithDeferredRedeemer(
            C.RewardAddress.fromCredentials(C.NetworkId.Testnet, credential),
            1n,
            callback
          );
          break;
        case 'certificate':
          builder.addCertificateWithDeferredRedeemer(
            { type: C.CertificateType.UpdateDRep, dRepCredential: credential, anchor: null },
            callback
          );
          break;
        case 'vote':
          builder.voteWithDeferredRedeemer(
            { type: C.VoterType.DRepScriptHash, credential },
            { id: '22'.repeat(32), actionIndex: 0 },
            { vote: C.Vote.Yes, anchor: null },
            callback
          );
          break;
      }
      await builder.build();
      expect(callback).toHaveBeenCalled();
    } finally {
      builder.dispose();
    }
  });

  it('updates a DRep instead of deregistering it and retains a zero redeemer', async () => {
    const builder = makeSub();
    try {
      const cbor = await builder
        .addScript(script)
        .updateDRep({
          drepId: C.cip129DRepFromScript(script),
          anchor: { url: 'https://example.com/drep.json', dataHash: '33'.repeat(32) },
          redeemer: 0n
        })
        .build();
      const ptr = C.readSubTransactionFromCbor(cbor);
      const m = C.getModule();
      let body = 0,
        certificates = 0,
        certificate = 0;
      const out = m._malloc(4);
      try {
        body = m.sub_transaction_get_body(ptr);
        certificates = m.sub_transaction_body_get_certificates(body);
        C.assertSuccess(m.certificate_set_get(certificates, 0, out));
        certificate = m.getValue(out, 'i32');
        expect(C.readCertificate(certificate).type).toBe(C.CertificateType.UpdateDRep);
      } finally {
        C.unrefObject(certificate);
        C.unrefObject(certificates);
        C.unrefObject(body);
        C.unrefObject(ptr);
        m._free(out);
      }
    } finally {
      builder.dispose();
    }
  });

  it('prevents concurrent builds and disposal during an async callback', async () => {
    const builder = makeMain();
    const other = makeMain();
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    builder
      .setUtxos([input()])
      .setChangeAddress(address)
      .sendLovelace({ address, amount: 2000000n })
      .setCoinSelector({
        getName: () => 'delayed selector',
        select: async () => {
          await gate;
          return { selection: [input()], remaining: [] };
        }
      });
    const pending = builder.build();
    try {
      expect(() => builder.dispose()).toThrow('building');
      expect(() => builder.addGuard(guard)).toThrow('building');
      await expect(other.build()).rejects.toThrow('building');
    } finally {
      resume();
      await pending;
      builder.dispose();
      other.dispose();
    }
  });
  it('signs sub-transactions with both software key handlers', async () => {
    const builder = makeSub();
    try {
      const cbor = await builder.sendLovelace({ address, amount: 2000000n }).build();
      const password = () => new TextEncoder().encode('test password');
      const getPassword = async () => password();
      const key = C.Ed25519PrivateKey.fromExtendedHex(
        'f04462421183d227bbc0fa60799ef338169c05eed7aa6aac19bc4db20557df51e154255decce80ae4ab8a61af6abde05e7fbc049861cc040a7afe4fb0a875899'
      );
      const single = await C.SoftwareEd25519SecureKeyHandler.fromEd25519Key(key, password(), getPassword);
      const bip32 = await C.SoftwareBip32SecureKeyHandler.fromEntropy(new Uint8Array(32), password(), getPassword);
      const path: C.DerivationPath = {
        purpose: C.harden(1852),
        coinType: C.harden(1815),
        account: C.harden(0),
        role: 0,
        index: 0
      };
      const witnesses = [
        ...(await single.signSubTransaction!(cbor)),
        ...(await bip32.signSubTransaction!(cbor, [path]))
      ];
      const id = C.getSubTransactionId(cbor);
      for (const witness of witnesses) {
        expect(
          C.Ed25519PublicKey.fromHex(witness.vkey).verify(
            C.Ed25519Signature.fromHex(witness.signature),
            C.hexToUint8Array(id)
          )
        ).toBe(true);
      }
      const signed = C.applySubTransactionWitnesses(cbor, witnesses);
      expect(signed).not.toBe(cbor);
      expect(C.getSubTransactionId(signed)).toBe(id);
    } finally {
      builder.dispose();
    }
  });
});
