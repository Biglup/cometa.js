import { BaseProvider } from './BaseProvider';
import { CostModel } from '../common';
import { NetworkMagic } from '../common/NetworkMagic';
import { ProtocolParameters } from '../common/ProtocolParameters';
import { Redeemer } from '../common/Redeemer';
import { TransactionInput } from '../common/TransactionInput';
import { UTxO } from '../common/UTxO';
import { toUnitInterval } from '../marshaling';

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

export const fromBlockfrostLanguageVersion = (x: string): number => {
  switch (x) {
    case 'PlutusV1': {
      return 0;
    }
    case 'PlutusV2': {
      return 1;
    }
    case 'PlutusV3': {
      return 2;
    }
    // No default
  }
  throw new Error('fromBlockfrostLanguageVersion: Unreachable!');
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
    const json = await fetch(`${this.url}${query}`, {
      headers: this.headers()
    }).then((resp) => resp.json());

    if (!json) {
      throw new Error('getParameters: Could not parse response json');
    }

    const response = json;

    if ('message' in response) {
      throw new Error(`getParameters: Blockfrost threw "${response.message}"`);
    }

    const costModels: CostModel[] = Object.entries((response.cost_models_raw ?? {}) as Record<string, number[]>).map(
      ([language, costs]) => ({ costs, language })
    );

    return {
      adaPerUtxoByte: Number(response.coins_per_utxo_word),
      collateralPercent: Number(response.collateral_percent),
      committeeTermLimit: Number(response.committee_max_term_length),
      costModels,
      decentralisationParam: toUnitInterval(response.decentralisation_param),
      drepDeposit: Number(response.drep_deposit),
      drepInactivityPeriod: Number(response.drep_activity),
      drepVotingThresholds: {
        committeeNoConfidence: toUnitInterval(response.dvt_committee_no_confidence),
        committeeNormal: toUnitInterval(response.dvt_committee_normal),
        hardForkInitiation: toUnitInterval(response.dvt_hard_fork_initiation),
        motionNoConfidence: toUnitInterval(response.dvt_motion_no_confidence),
        ppEconomicGroup: toUnitInterval(response.dvt_p_p_economic_group),
        ppGovernanceGroup: toUnitInterval(response.dvt_p_p_gov_group),
        ppNetworkGroup: toUnitInterval(response.dvt_p_p_network_group),
        ppTechnicalGroup: toUnitInterval(response.dvt_p_p_technical_group),
        treasuryWithdrawal: toUnitInterval(response.dvt_treasury_withrawal),
        updateConstitution: toUnitInterval(response.dvt_update_to_constitution)
      },
      executionCosts: {
        memory: Number(response.price_mem),
        steps: Number(response.price_step)
      },
      expansionRate: toUnitInterval(response.rho),
      extraEntropy: response.extra_entropy as string | null,
      governanceActionDeposit: Number(response.gov_action_deposit),
      governanceActionValidityPeriod: Number(response.gov_action_lifetime),
      keyDeposit: Number(response.key_deposit),
      maxBlockBodySize: Number(response.max_block_size),
      maxBlockExUnits: {
        memory: Number(response.max_block_ex_mem),
        steps: Number(response.max_block_ex_steps)
      },
      maxBlockHeaderSize: Number(response.max_block_header_size),
      maxCollateralInputs: Number(response.max_collateral_inputs),
      maxEpoch: Number(response.e_max),
      maxTxExUnits: {
        memory: Number(response.max_tx_ex_mem),
        steps: Number(response.max_tx_ex_steps)
      },
      maxTxSize: Number(response.max_tx_size),
      maxValueSize: Number(response.max_val_size),
      minCommitteeSize: Number(response.committee_min_size),
      minFeeA: Number(response.min_fee_a),
      minFeeB: Number(response.min_fee_b),
      minPoolCost: Number(response.min_pool_cost),
      nOpt: Number(response.n_opt),
      poolDeposit: Number(response.pool_deposit),
      poolPledgeInfluence: toUnitInterval(response.a0),
      poolVotingThresholds: {
        committeeNoConfidence: toUnitInterval(response.pvt_committee_no_confidence),
        committeeNormal: toUnitInterval(response.pvt_committee_normal),
        hardForkInitiation: toUnitInterval(response.pvt_hard_fork_initiation),
        motionNoConfidence: toUnitInterval(response.pvt_motion_no_confidence),
        securityRelevantParamVotingThreshold: toUnitInterval(
          response.pvt_p_p_security_group ?? response.pvtpp_security_group
        )
      },
      protocolVersion: {
        major: Number(response.protocol_major_ver),
        minor: Number(response.protocol_minor_ver)
      },
      refScriptCostPerByte: toUnitInterval(response.min_fee_ref_script_cost_per_byte),
      treasuryGrowthRate: toUnitInterval(response.tau)
    };
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
        results.add({
          address: blockfrostUTxO.address,
          amount: blockfrostUTxO.amount,
          block: blockfrostUTxO.block,
          dataHash: blockfrostUTxO.data_hash,
          inlineDatum: blockfrostUTxO.inline_datum,
          outputIndex: blockfrostUTxO.output_index,
          referenceScriptHash: blockfrostUTxO.reference_script_hash,
          txHash: blockfrostUTxO.tx_hash
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

    const results: Set<UTxO> = new Set();

    for (;;) {
      const pagination = `count=${maxPageCount}&page=${page}`;
      const query = `/addresses/${address}/utxos/${assetId}?${pagination}`;
      const json = await fetch(`${this.url}${query}`, {
        headers: this.headers()
      }).then((resp) => resp.json());

      if (!json) {
        throw new Error('getUnspentOutputsWithAsset: Could not parse response json');
      }

      const response = json;

      if ('message' in response) {
        throw new Error(`getUnspentOutputsWithAsset: Blockfrost threw "${response.message}"`);
      }

      for (const blockfrostUTxO of response) {
        results.add({
          address: blockfrostUTxO.address,
          amount: blockfrostUTxO.amount,
          block: blockfrostUTxO.block,
          dataHash: blockfrostUTxO.data_hash,
          inlineDatum: blockfrostUTxO.inline_datum,
          outputIndex: blockfrostUTxO.output_index,
          referenceScriptHash: blockfrostUTxO.reference_script_hash,
          txHash: blockfrostUTxO.tx_hash
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

  async getUnspentOutputByNFT(assetId: string): Promise<UTxO> {
    const query = `/assets/${assetId}/addresses`;
    const json = await fetch(`${this.url}${query}`, {
      headers: this.headers()
    }).then((resp) => resp.json());

    if (!json) {
      throw new Error('getUnspentOutputByNFT: Could not parse response json');
    }

    const response = json;

    if ('message' in response) {
      throw new Error(`getUnspentOutputByNFT: Blockfrost threw "${response.message}"`);
    }
    // Ensures a single asset address is returned
    if (response.length === 0) {
      throw new Error('getUnspentOutputByNFT: No addresses found holding the asset.');
    }
    if (response.length > 1) {
      throw new Error('getUnspentOutputByNFT: Asset must be held by only one address. Multiple found.');
    }

    const utxos: Array<UTxO> = [];

    for (const blockfrostUTxO of response) {
      utxos.push({
        address: blockfrostUTxO.address,
        amount: blockfrostUTxO.amount,
        block: blockfrostUTxO.block,
        dataHash: blockfrostUTxO.data_hash,
        inlineDatum: blockfrostUTxO.inline_datum,
        outputIndex: blockfrostUTxO.output_index,
        referenceScriptHash: blockfrostUTxO.reference_script_hash,
        txHash: blockfrostUTxO.tx_hash
      });
    }
    // Ensures a single UTxO holds the asset
    if (utxos.length !== 1) {
      throw new Error('getUnspentOutputByNFT: Asset must be present in only one UTxO. Multiple found.');
    }

    return utxos[0]!;
  }

  async resolveUnspentOutputs(txIns: TransactionInput[]): Promise<UTxO[]> {
    const results: Set<UTxO> = new Set();

    for (const txIn of txIns) {
      const query = `/txs/${txIn.txId}/utxos`;
      const json = await fetch(`${this.url}${query}`, {
        headers: this.headers()
      }).then((resp) => resp.json());

      if (!json) {
        throw new Error('resolveUnspentOutputs: Could not parse response json');
      }

      const response = json;

      if ('message' in response) {
        throw new Error(`resolveUnspentOutputs: Blockfrost threw "${response.message}"`);
      }

      const txIndex = txIn.index;

      for (const blockfrostUTxO of response.outputs) {
        if (blockfrostUTxO.output_index !== txIndex) {
          continue;
        }

        results.add({
          address: blockfrostUTxO.address,
          amount: blockfrostUTxO.amount,
          block: blockfrostUTxO.block,
          dataHash: txIn.txId,
          inlineDatum: blockfrostUTxO.inline_datum,
          outputIndex: blockfrostUTxO.output_index,
          referenceScriptHash: blockfrostUTxO.reference_script_hash,
          txHash: blockfrostUTxO.tx_hash
        });
      }
    }

    return [...results];
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

  async awaitTransactionConfirmation(txId: string, timeout?: number): Promise<boolean> {
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

  async postTransactionToChain(tx: string): Promise<string> {
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

  async evaluateTransaction(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]> {
    const additionalUtxoSet = new Set();
    for (const utxo of additionalUtxos || []) {
      const txIn = {
        index: utxo.outputIndex,
        txId: utxo.txHash
      };

      const txOut = {
        address: utxo.address,
        datum: utxo.inlineDatum,
        datum_hash: utxo.dataHash,
        script: utxo.scriptReference,
        value: {
          assets: utxo.amount.filter((asset) => asset.unit !== 'lovelace'),
          coins: BigInt(utxo.amount.find((asset) => asset.unit === 'lovelace')?.quantity || 0)
        }
      };

      additionalUtxoSet.add([txIn, txOut]);
    }

    const payload = {
      additionalUtxoset: [...additionalUtxoSet],
      cbor: tx
    };

    const query = '/utils/txs/evaluate/utxos';
    const response = await fetch(`${this.url}${query}`, {
      body: JSON.stringify(payload, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...this.headers()
      },
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `evaluateTransaction: failed to evaluate transaction with additional UTxO set in Blockfrost endpoint.\nError ${error}`
      );
    }

    const json = await response.json();
    if ('message' in json) {
      throw new Error(`evaluateTransaction: Blockfrost threw "${json.message}"`);
    }

    const evaledRedeemers: Set<Redeemer> = new Set();

    if (!('EvaluationResult' in json.result)) {
      throw new Error('evaluateTransaction: Blockfrost endpoint returned evaluation failure.');
    }
    const result = json.result.EvaluationResult;
    if (!result) {
      throw new Error('evaluateTransaction: Blockfrost endpoint returned no evaluation result.');
    }

    if (!result.redeemers) {
      throw new Error('evaluateTransaction: Blockfrost endpoint returned no redeemers.');
    }

    for (const redeemer of result.redeemers) {
      evaledRedeemers.add({
        dataCbor: '',
        executionUnits: {
          memory: redeemer.execution_units.mem,
          steps: redeemer.execution_units.step
        },
        index: redeemer.index, // TOOD: Add
        purpose: redeemer.purpose
      });
    }

    return [...evaledRedeemers];
  }
}
