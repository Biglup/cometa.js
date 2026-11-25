/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Address, RewardAddress } from '../address';
import { Blake2b } from '../crypto';
import { Http, ProviderHttpError, credential } from './internal/Http';
import { NetworkMagic, ProtocolParameters, Redeemer, TxIn, UTxO } from '../common';
import { Provider } from './Provider';
import { addressText } from './internal/Outputs';
import { array, hex, invalid, natural, networkName, object, resolveOrder, transactionId } from './internal/Values';
import { confirm } from './internal/Confirmation';
import { hexToUint8Array, uint8ArrayToHex } from '../cometa';
import { hydraOutputs, hydraParameters } from './internal/Hydra';

/** Explicit Hydra node configuration. The node must serve an open Conway Head. */
export interface HydraProviderOptions {
  network: NetworkMagic;
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Hydra HTTP provider for an existing Head. Submissions use /transaction (L2).
 * Confirmation polls the latest signed snapshot's transaction list; older
 * transactions absent from that list cannot be rediscovered through this API.
 * A UTxO alone is never treated as proof of L2 confirmation: it may originate
 * from an L1 deposit. Rewards and remote evaluation are explicitly unsupported.
 * Use a local evaluator configured for the Head's ledger parameters for scripts.
 */
export class HydraProvider implements Provider {
  private readonly http: Http;
  private readonly pollInterval: number;
  private readonly network: NetworkMagic;

  constructor(options: HydraProviderOptions) {
    networkName(options.network);
    this.network = options.network;
    this.pollInterval = options.pollIntervalMs ?? 1000;
    if (!Number.isSafeInteger(this.pollInterval) || this.pollInterval < 1 || this.pollInterval > 60000)
      throw new Error('Invalid polling interval');
    this.http = new Http(
      options.baseUrl,
      options.token === undefined ? {} : { Authorization: `Bearer ${credential(options.token)}` },
      options.timeoutMs
    );
  }

  getName(): string {
    return 'Hydra';
  }
  getNetworkMagic(): NetworkMagic {
    return this.network;
  }
  async getParameters(): Promise<ProtocolParameters> {
    return hydraParameters(await this.http.json(['protocol-parameters']));
  }

  async getUnspentOutputs(address: Address | string): Promise<UTxO[]> {
    const expected = addressText(typeof address === 'string' ? address : address.toString());
    return (await this.outputs()).filter((value) => value.output.address === expected);
  }

  async getUnspentOutputsWithAsset(address: Address | string, assetId: string): Promise<UTxO[]> {
    const asset = HydraProvider.asset(assetId);
    return (await this.getUnspentOutputs(address)).filter((value) => (value.output.value.assets?.[asset] ?? 0n) > 0n);
  }

  async getUnspentOutputByNft(assetId: string): Promise<UTxO> {
    const asset = HydraProvider.asset(assetId);
    const values = (await this.outputs()).filter((value) => (value.output.value.assets?.[asset] ?? 0n) > 0n);
    if (values.length !== 1 || values[0].output.value.assets?.[asset] !== 1n)
      throw new Error('Expected exactly one NFT output');
    return values[0];
  }

  async resolveUnspentOutputs(inputs: TxIn[]): Promise<UTxO[]> {
    return resolveOrder(
      inputs,
      (await this.outputs()).filter((value) =>
        inputs.some((input) => input.txId === value.input.txId && input.index === value.input.index)
      )
    );
  }

  async resolveDatum(hash: string): Promise<string> {
    const expected = hex(hash, 32);
    const snapshot = object(await this.http.json(['snapshot', 'utxo']));
    hydraOutputs(snapshot);
    for (const value of Object.values(snapshot)) {
      const raw = object(value).inlineDatumRaw;
      if (raw === undefined || raw === null) continue;
      const cbor = hex(raw);
      if (uint8ArrayToHex(Blake2b.computeHash(hexToUint8Array(cbor), 32)) === expected) return cbor;
    }
    throw new Error('Datum is not available in the current Hydra snapshot');
  }

  async submitTransaction(tx: string): Promise<string> {
    const expected = transactionId(tx);
    const reply = await this.http.jsonResponse(
      ['transaction'],
      {},
      { cborHex: hex(tx), description: '', type: 'Tx ConwayEra' }
    );
    const response = object(reply.value);
    if (reply.status === 200 && response.tag === 'SubmitTxConfirmed') natural(response.snapshotNumber);
    else if (reply.status !== 202 || response.tag !== 'SubmitTxSubmitted') return invalid();
    return expected;
  }

  async confirmTransaction(txId: string, timeout = 20000): Promise<boolean> {
    const expected = hex(txId, 32);
    return confirm(timeout, this.pollInterval, async (remaining) => {
      try {
        const response = object(await this.http.json(['snapshot'], {}, undefined, remaining));
        if (response.tag === 'InitialSnapshot') return false;
        if (response.tag !== 'ConfirmedSnapshot') return invalid();
        const snapshot = object(response.snapshot);
        natural(snapshot.number);
        return array(snapshot.confirmed)
          .map((entry) => {
            const tx = object(entry);
            const actual = transactionId(hex(tx.cborHex));
            if (tx.txId !== undefined && hex(tx.txId, 32) !== actual) return invalid();
            return actual;
          })
          .includes(expected);
      } catch (error) {
        if (error instanceof ProviderHttpError && error.status === 404) return false;
        throw error;
      }
    });
  }

  async getRewardsBalance(_address: RewardAddress | string): Promise<bigint> {
    throw new Error('Hydra Heads do not support staking rewards');
  }

  async evaluateTransaction(_tx: string, _additionalUtxos: UTxO[] = []): Promise<Redeemer[]> {
    throw new Error('Hydra has no remote evaluation endpoint; configure a local evaluator');
  }

  private async outputs(): Promise<UTxO[]> {
    return hydraOutputs(await this.http.json(['snapshot', 'utxo']));
  }
  private static asset(value: string): string {
    const unit = hex(value);
    if (unit.length < 56 || unit.length > 120) throw new Error('Invalid native asset');
    return unit;
  }
}
