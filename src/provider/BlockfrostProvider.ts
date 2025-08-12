import { BaseProvider } from './BaseProvider';
import {
  CostModel,
  PlutusLanguageVersion,
  Script,
  ScriptType,
  TxOut,
  Value,
  cborToPlutusData,
  jsonToNativeScript,
  nativeScriptToJson,
  plutusDataToCbor
} from '../common';
import { NetworkMagic } from '../common/NetworkMagic';
import { ProtocolParameters } from '../common/ProtocolParameters';
import { Redeemer } from '../common/Redeemer';
import { TransactionInput } from '../common/TransactionInput';
import { UTxO } from '../common/UTxO';
import { readRedeemersFromTx, toUnitInterval } from '../marshaling';

const networkMagicBlockfrostPrefix = (magic: NetworkMagic) => {
  let prefix;
  switch (magic) {
    case NetworkMagic.PREPROD:
      prefix = 'cardano-preprod';
      break;
    case NetworkMagic.PREVIEW:
      prefix = 'cardano-preview';
      break;
    case NetworkMagic.SANCHONET:
      prefix = 'cardano-sanchonet';
      break;
    case NetworkMagic.MAINNET:
      prefix = 'cardano-mainnet';
      break;
    default:
      prefix = 'unknown';
      break;
  }

  return prefix;
};

/**
 * Creates a lookup map from an array of redeemers for efficient merging.
 *
 * @param {Redeemer[]} redeemers An array of the original redeemers from a transaction.
 * @returns {Map<string, Redeemer>} A map where the key is a string like "spend:0"
 * and the value is the original Redeemer object.
 */
export const createRedeemerMap = (redeemers: Redeemer[]): Map<string, Redeemer> => {
  const map = new Map<string, Redeemer>();

  for (const redeemer of redeemers) {
    const key = `${redeemer.purpose}:${redeemer.index}`;
    map.set(key, redeemer);
  }

  return map;
};

const plutusVersionToApiString: Record<PlutusLanguageVersion, string> = {
  [PlutusLanguageVersion.V1]: 'plutus:v1',
  [PlutusLanguageVersion.V2]: 'plutus:v2',
  [PlutusLanguageVersion.V3]: 'plutus:v3'
};

/**
 * Recreates the logic from the C reference implementation to serialize a UTxO
 * into a pair of JSON objects (input and output) for the transaction evaluation endpoint.
 *
 * @param {UTxO} utxo The UTxO to serialize.
 * @returns {[object, object]} A tuple containing the JSON for the input and the output.
 */
export const prepareUtxoForEvaluation = (utxo: UTxO): [object, object] => {
  const inputJson = {
    id: utxo.input.txId,
    index: utxo.input.index
  };

  const valuePayload: any = {
    ada: {
      lovelace: Number(utxo.output.value.coins) // Send as a number
    }
  };

  for (const assetId in utxo.output.value.assets ?? {}) {
    const policyId = assetId.slice(0, 56);
    const assetName = assetId.slice(56);
    const quantity = utxo.output.value.assets?.[assetId];

    if (!valuePayload[policyId]) {
      valuePayload[policyId] = {};
    }
    valuePayload[policyId][assetName] = Number(quantity); // Send as a number
  }

  const outputJson: any = {
    address: utxo.output.address,
    value: valuePayload // Use the correctly built value payload
  };

  if (utxo.output.datum) {
    outputJson.datum = plutusDataToCbor(utxo.output.datum);
  } else if (utxo.output.datumHash) {
    outputJson.datumHash = utxo.output.datumHash;
  }

  const scriptRef = utxo.output.scriptReference;
  if (scriptRef) {
    if (scriptRef.__type === ScriptType.Plutus) {
      outputJson.script = {
        cbor: scriptRef.bytes,
        language: plutusVersionToApiString[scriptRef.version]
      };
    } else if (scriptRef.__type === ScriptType.Native) {
      outputJson.script = {
        json: nativeScriptToJson(scriptRef),
        language: 'native'
      };
    }
  }

  return [inputJson, outputJson];
};

const inputFromUtxo = (utxo: any): any => ({
  index: utxo.output_index,
  txId: utxo.tx_hash
});

const outputFromUtxo = (address: string, utxo: any, script: Script | undefined): TxOut => {
  const value: Value = {
    assets: {},
    coins: BigInt(utxo.amount.find(({ unit }: any) => unit === 'lovelace')?.quantity ?? '0')
  };

  for (const { quantity, unit } of utxo.amount) {
    if (unit === 'lovelace') continue;
    if (!value.assets) value.assets = {};
    value.assets[unit] = BigInt(quantity);
  }

  if (Object.keys(value.assets ?? {}).length === 0) {
    delete value.assets;
  }

  const txOut: TxOut = {
    address,
    value
  };

  if (utxo.inline_datum) txOut.datum = cborToPlutusData(utxo.inline_datum);
  if (utxo.data_hash) txOut.datumHash = utxo.data_hash;
  if (script) {
    txOut.scriptReference = script;
  }

  return txOut;
};

export class BlockfrostProvider extends BaseProvider {
  url: string;
  private projectId: string;

  constructor({ network, projectId }: { network: NetworkMagic; projectId: string }) {
    super(network, 'Blockfrost JS');
    this.url = `https://${networkMagicBlockfrostPrefix(network)}.blockfrost.io/api/v0/`;
    this.projectId = projectId;
  }

  headers() {
    return { project_id: this.projectId };
  }

  async getParameters(): Promise<ProtocolParameters> {
    const query = 'epochs/latest/parameters';
    const response = await fetch(`${this.url}${query}`, {
      // Await the fetch call
      headers: this.headers()
    });

    // Check for network errors before parsing JSON
    if (!response.ok) {
      throw new Error(`getParameters: Network request failed with status ${response.status}`);
    }

    const json = await response.json(); // Await the JSON parsing

    if (!json) {
      throw new Error('getParameters: Could not parse response json');
    }

    const data = json; // Renamed to 'data' to avoid confusion with the `json` variable itself being the object.

    if ('message' in data) {
      // Now `data` is the parsed JSON object
      throw new Error(`getParameters: Blockfrost threw "${data.message}"`);
    }

    const costModels: CostModel[] = Object.entries((data.cost_models_raw ?? {}) as Record<string, number[]>).map(
      ([language, costs]) => ({ costs, language })
    );

    return {
      adaPerUtxoByte: Number(data.coins_per_utxo_word),
      collateralPercent: Number(data.collateral_percent),
      committeeTermLimit: Number(data.committee_max_term_length),
      costModels,
      decentralisationParam: toUnitInterval(data.decentralisation_param),
      drepDeposit: Number(data.drep_deposit),
      drepInactivityPeriod: Number(data.drep_activity),
      drepVotingThresholds: {
        committeeNoConfidence: toUnitInterval(data.dvt_committee_no_confidence),
        committeeNormal: toUnitInterval(data.dvt_committee_normal),
        hardForkInitiation: toUnitInterval(data.dvt_hard_fork_initiation),
        motionNoConfidence: toUnitInterval(data.dvt_motion_no_confidence),
        ppEconomicGroup: toUnitInterval(data.dvt_p_p_economic_group),
        ppGovernanceGroup: toUnitInterval(data.dvt_p_p_gov_group),
        ppNetworkGroup: toUnitInterval(data.dvt_p_p_network_group),
        ppTechnicalGroup: toUnitInterval(data.dvt_p_p_technical_group),
        treasuryWithdrawal: toUnitInterval(data.dvt_treasury_withrawal),
        updateConstitution: toUnitInterval(data.dvt_update_to_constitution)
      },
      executionCosts: {
        memory: toUnitInterval(data.price_mem),
        steps: toUnitInterval(data.price_step)
      },
      expansionRate: toUnitInterval(data.rho),
      extraEntropy: data.extra_entropy as string | null,
      governanceActionDeposit: Number(data.gov_action_deposit),
      governanceActionValidityPeriod: Number(data.gov_action_lifetime),
      keyDeposit: Number(data.key_deposit),
      maxBlockBodySize: Number(data.max_block_size),
      maxBlockExUnits: {
        memory: Number(data.max_block_ex_mem),
        steps: Number(data.max_block_ex_steps)
      },
      maxBlockHeaderSize: Number(data.max_block_header_size),
      maxCollateralInputs: Number(data.max_collateral_inputs),
      maxEpoch: Number(data.e_max),
      maxTxExUnits: {
        memory: Number(data.max_tx_ex_mem),
        steps: Number(data.max_tx_ex_steps)
      },
      maxTxSize: Number(data.max_tx_size),
      maxValueSize: Number(data.max_val_size),
      minCommitteeSize: Number(data.committee_min_size),
      minFeeA: Number(data.min_fee_a),
      minFeeB: Number(data.min_fee_b),
      minPoolCost: Number(data.min_pool_cost),
      nOpt: Number(data.n_opt),
      poolDeposit: Number(data.pool_deposit),
      poolPledgeInfluence: toUnitInterval(data.a0),
      poolVotingThresholds: {
        committeeNoConfidence: toUnitInterval(data.pvt_committee_no_confidence),
        committeeNormal: toUnitInterval(data.pvt_committee_normal),
        hardForkInitiation: toUnitInterval(data.pvt_hard_fork_initiation),
        motionNoConfidence: toUnitInterval(data.pvt_motion_no_confidence),
        securityRelevantParamVotingThreshold: toUnitInterval(data.pvt_p_p_security_group ?? data.pvtpp_security_group)
      },
      protocolVersion: {
        major: Number(data.protocol_major_ver),
        minor: Number(data.protocol_minor_ver)
      },
      refScriptCostPerByte: toUnitInterval(data.min_fee_ref_script_cost_per_byte),
      treasuryGrowthRate: toUnitInterval(data.tau)
    };
  }

  /**
   * Retrieves the staking rewards for a given reward address.
   *
   * @param {string} address The Bech32-encoded stake address (e.g., stake_test1...).
   * @returns {Promise<bigint>} A promise that resolves to the amount of withdrawable
   * rewards in Lovelace. Returns 0n if the account is not found (404).
   */
  async getRewardsBalance(address: string): Promise<bigint> {
    const query = `accounts/${address}`;

    const response = await fetch(`${this.url}${query}`, {
      headers: this.headers()
    });

    if (response.status === 404) {
      return 0n;
    }

    if (!response.ok) {
      throw new Error(`getRewardsBalance: Network request failed with status ${response.status}`);
    }

    const json = await response.json();

    if (!json) {
      throw new Error('getRewardsBalance: Could not parse response json');
    }

    if ('message' in json) {
      throw new Error(`getRewardsBalance: Blockfrost threw "${json.message}"`);
    }

    if (typeof json.withdrawable_amount !== 'string') {
      throw new TypeError(
        'getRewardsBalance: Invalid response format, "withdrawable_amount" not found or not a string.'
      );
    }

    return BigInt(json.withdrawable_amount);
  }

  async getUnspentOutputs(address: string): Promise<UTxO[]> {
    const maxPageCount = 100;
    let page = 1;

    const results: Set<UTxO> = new Set();

    for (;;) {
      const pagination = `count=${maxPageCount}&page=${page}`;
      const query = `/addresses/${address}/utxos?${pagination}`;
      const json = await fetch(`${this.url}${query}`, {
        headers: this.headers()
      }).then((resp) => resp.json());

      if (!json) {
        throw new Error('getUnspentOutputs: Could not parse response json');
      }

      const response = json;

      if ('message' in response) {
        throw new Error(`getUnspentOutputs: Blockfrost threw "${response.message}"`);
      }

      for (const blockfrostUTxO of response) {
        let scriptReference;
        if (blockfrostUTxO.reference_script_hash) {
          scriptReference = await this.getScriptRef(blockfrostUTxO.reference_script_hash);
        }

        results.add({
          input: inputFromUtxo(blockfrostUTxO),
          output: outputFromUtxo(address, blockfrostUTxO, scriptReference)
        });
      }

      if (response.length < maxPageCount) {
        break;
      } else {
        page += 1;
      }
    }

    return [...results];
  }

  async getUnspentOutputsWithAsset(address: string, assetId: string): Promise<UTxO[]> {
    const maxPageCount = 100;
    let page = 1;
    // Improvement: Use a Set for consistency and automatic de-duplication
    const results: Set<UTxO> = new Set();

    for (;;) {
      const pagination = `count=${maxPageCount}&page=${page}`;
      const query = `/addresses/${address}/utxos/${assetId}?${pagination}`;
      const response = await fetch(`${this.url}${query}`, {
        headers: this.headers()
      });

      if (!response.ok) {
        throw new Error(`getUnspentOutputsWithAsset: Network request failed with status ${response.status}`);
      }
      const json = await response.json();

      if ('message' in json) {
        throw new Error(`getUnspentOutputsWithAsset: Blockfrost threw "${json.message}"`);
      }

      for (const blockfrostUTxO of json) {
        let scriptReference;
        if (blockfrostUTxO.reference_script_hash) {
          scriptReference = await this.getScriptRef(blockfrostUTxO.reference_script_hash);
        }
        results.add({
          input: inputFromUtxo(blockfrostUTxO),
          output: outputFromUtxo(address, blockfrostUTxO, scriptReference)
        });
      }

      if (json.length < maxPageCount) {
        break;
      } else {
        page += 1;
      }
    }
    return [...results];
  }

  async getUnspentOutputByNft(assetId: string): Promise<UTxO> {
    const query = `/assets/${assetId}/addresses`;
    const response = await fetch(`${this.url}${query}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error(`getUnspentOutputByNFT: Failed to fetch asset addresses. Status: ${response.status}`);
    }
    const json = await response.json();

    if ('message' in json) {
      throw new Error(`getUnspentOutputByNFT: Blockfrost threw "${json.message}"`);
    }

    if (json.length === 0) {
      throw new Error('getUnspentOutputByNFT: No addresses found holding the asset.');
    }
    if (json.length > 1) {
      throw new Error('getUnspentOutputByNFT: Asset must be held by only one address. Multiple found.');
    }

    const holderAddress = json[0].address;
    const utxos = await this.getUnspentOutputsWithAsset(holderAddress, assetId);

    if (utxos.length !== 1) {
      throw new Error('getUnspentOutputByNFT: Asset must be present in only one UTxO.');
    }

    return utxos[0]!;
  }

  async resolveUnspentOutputs(txIns: TransactionInput[]): Promise<UTxO[]> {
    const results: UTxO[] = [];

    for (const txIn of txIns) {
      const query = `/txs/${txIn.txId}/utxos`;
      const response = await fetch(`${this.url}${query}`, {
        headers: this.headers()
      });

      if (!response.ok) {
        throw new Error(`resolveUnspentOutputs: Failed to fetch tx utxos for ${txIn.txId}. Status: ${response.status}`);
      }
      const json = await response.json();

      if ('message' in json) {
        throw new Error(`resolveUnspentOutputs: Blockfrost threw "${json.message}"`);
      }

      const matchingOutput = json.outputs.find((out: any) => out.output_index === txIn.index);

      if (matchingOutput) {
        matchingOutput.tx_hash = txIn.txId;

        let scriptReference;
        if (matchingOutput.reference_script_hash) {
          scriptReference = await this.getScriptRef(matchingOutput.reference_script_hash);
        }

        results.push({
          input: inputFromUtxo(matchingOutput),
          output: outputFromUtxo(matchingOutput.address, matchingOutput, scriptReference)
        });
      }
    }
    return results;
  }

  async resolveDatum(datumHash: string): Promise<string> {
    const query = `/scripts/datum/${datumHash}/cbor`;
    const json = await fetch(`${this.url}${query}`, {
      headers: this.headers()
    }).then((resp) => resp.json());

    if (!json) {
      throw new Error('resolveDatum: Could not parse response json');
    }

    const response = json;

    if ('message' in response) {
      throw new Error(`resolveDatum: Blockfrost threw "${response.message}"`);
    }

    return response.cbor;
  }

  async confirmTransaction(txId: string, timeout?: number): Promise<boolean> {
    const averageBlockTime = 20_000;

    const query = `/txs/${txId}/metadata/cbor`;
    const startTime = Date.now();

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const checkConfirmation = async () => {
      const response = await fetch(`${this.url}${query}`, {
        headers: this.headers()
      });

      return response.ok;
    };

    if (await checkConfirmation()) {
      return true;
    }

    if (timeout) {
      while (Date.now() - startTime < timeout) {
        await delay(averageBlockTime);

        if (await checkConfirmation()) {
          return true;
        }
      }
    }

    return false;
  }

  async submitTransaction(tx: string): Promise<string> {
    const query = '/tx/submit';
    const response = await fetch(`${this.url}${query}`, {
      body: Buffer.from(tx, 'hex'),
      headers: {
        'Content-Type': 'application/cbor',
        ...this.headers()
      },
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`postTransactionToChain: failed to submit transaction to Blockfrost endpoint.\nError ${error}`);
    }

    return (await response.json()) as string;
  }

  async evaluateTransaction(tx: string, additionalUtxos: UTxO[] = []): Promise<Redeemer[]> {
    const originalRedeemers = readRedeemersFromTx(tx);
    const originalRedeemerMap = createRedeemerMap(originalRedeemers);

    const payload = {
      additionalUtxo: additionalUtxos.length > 0 ? additionalUtxos.flatMap(prepareUtxoForEvaluation) : undefined,
      cbor: tx
    };

    const query = '/utils/txs/evaluate/utxos';
    const response = await fetch(`${this.url}${query}`, {
      body: JSON.stringify(payload, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
      headers: {
        'Content-Type': 'application/json',
        ...this.headers()
      },
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`evaluateTransaction: failed to evaluate transaction. Error: ${error}`);
    }

    const json = await response.json();
    if ('message' in json) {
      throw new Error(`evaluateTransaction: Blockfrost threw "${json.message}"`);
    }

    if ('fault' in json) {
      throw new Error(`evaluateTransaction: Blockfrost threw: ${json.fault.string}`);
    }

    if (!('EvaluationResult' in json.result)) {
      throw new Error(
        `evaluateTransaction: Blockfrost endpoint returned evaluation failure: ${JSON.stringify(json.result)}`
      );
    }

    const resultMap = json.result.EvaluationResult;
    const mergedRedeemers: Redeemer[] = [];

    for (const key in resultMap) {
      const originalRedeemer = originalRedeemerMap.get(key);
      if (!originalRedeemer) {
        continue;
      }

      const exUnits = resultMap[key];

      mergedRedeemers.push({
        ...originalRedeemer,
        executionUnits: {
          memory: Number(exUnits.memory),
          steps: Number(exUnits.steps)
        }
      });
    }

    return mergedRedeemers;
  }

  /**
   * Fetches a script from the blockchain provider by its hash.
   * Handles both Plutus and native (timelock) scripts.
   * @param scriptHash The hex-encoded hash of the script.
   * @returns A Promise that resolves to a Script object.
   */
  // eslint-disable-next-line max-statements
  private async getScriptRef(scriptHash: string): Promise<Script> {
    const typeQuery = `/scripts/${scriptHash}`;
    const typeJsonResponse = await fetch(`${this.url}${typeQuery}`, {
      headers: this.headers()
    });

    if (!typeJsonResponse.ok) {
      throw new Error(
        `getScriptRef: Failed to fetch script type for ${scriptHash}. Status: ${typeJsonResponse.status}`
      );
    }

    const typeJson = await typeJsonResponse.json();

    if (!typeJson || typeof typeJson.type !== 'string') {
      throw new Error('getScriptRef: Could not parse script type from response');
    }

    if ('message' in typeJson) {
      throw new Error(`getScriptRef: Blockfrost threw "${typeJson.message}"`);
    }

    const type: string = typeJson.type;

    if (type === 'timelock') {
      const jsonQuery = `/scripts/${scriptHash}/json`;
      const scriptJsonResponse = await fetch(`${this.url}${jsonQuery}`, {
        headers: this.headers()
      });

      if (!scriptJsonResponse.ok) {
        throw new Error(`getScriptRef: Failed to fetch timelock JSON. Status: ${scriptJsonResponse.status}`);
      }

      const scriptJson = await scriptJsonResponse.json();

      if (!scriptJson?.json) {
        throw new Error('getScriptRef: Invalid JSON response for timelock script');
      }

      return jsonToNativeScript(scriptJson.json);
    }

    const plutusVersionMap: Record<string, PlutusLanguageVersion> = {
      plutusV1: PlutusLanguageVersion.V1,
      plutusV2: PlutusLanguageVersion.V2,
      plutusV3: PlutusLanguageVersion.V3
    };

    const version = plutusVersionMap[type];

    if (!version) {
      throw new Error(`Unsupported script type "${type}" for script hash ${scriptHash}`);
    }

    const cborQuery = `/scripts/${scriptHash}/cbor`;
    const cborJsonResponse = await fetch(`${this.url}${cborQuery}`, {
      headers: this.headers()
    });

    if (!cborJsonResponse.ok) {
      throw new Error(`getScriptRef: Failed to fetch Plutus CBOR. Status: ${cborJsonResponse.status}`);
    }

    const cborJson = await cborJsonResponse.json();

    if (!cborJson?.cbor) {
      throw new Error('getScriptRef: Invalid CBOR response for Plutus script');
    }

    return {
      __type: ScriptType.Plutus,
      bytes: cborJson.cbor,
      version
    };
  }
}
