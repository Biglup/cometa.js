import { Address, RewardAddress } from '../address';
import { ProtocolParameters, UTxO, cborToPlutusData } from '../common';
import { blake2bHashFromHex, readBlake2bHashData } from './blake2b';
import { getFromInstanceRegistry } from '../instanceRegistry';
import { getModule } from '../module';
import { readInputSet } from './txIn';
import { readUtxoList, writeUtxo, writeUtxoList } from './utxo';
import { uint8ArrayToHex } from '../cometa';
import { writeProtocolParameters } from './protocolParameters';
import { writeRedeemerList } from './redeemer';
import { writeTransactionToCbor } from './transaction';
import { writePlutusData } from './plutusData';

export const bridgeCallbacks = {
  get_provider_from_registry(objectId: number) {
    return getFromInstanceRegistry(objectId);
  },
  marshal_blake2b_hash_from_hex(jsHexString: string) {
    return blake2bHashFromHex(jsHexString);
  },
  marshal_plutus_data(jsPlutusDataCborHex: string) {
    const plutusData = cborToPlutusData(jsPlutusDataCborHex);
    return writePlutusData(plutusData);
  },
  marshal_protocol_parameters(params: ProtocolParameters) {
    return writeProtocolParameters(params);
  },
  marshal_redeemer_list(jsRedeemerArray: any[]) {
    return writeRedeemerList(jsRedeemerArray);
  },
  marshal_utxo(jsUtxoObj: UTxO) {
    return writeUtxo(jsUtxoObj);
  },
  marshal_utxo_list(jsUtxoArray: UTxO[]) {
    return writeUtxoList(jsUtxoArray);
  },
  marshall_address(addressPtr: number) {
    const addr = new Address(addressPtr, false);
    return addr.toString();
  },
  marshall_asset_id(assetIdPtr: number) {
    const _Module = getModule();
    const hexStringPtr = _Module.asset_id_get_hex(assetIdPtr);
    return _Module.UTF8ToString(hexStringPtr);
  },
  marshall_blake2b_hash(hashPtr: number) {
    console.error('asdasdsa')
    return uint8ArrayToHex(readBlake2bHashData(hashPtr, false));
  },
  marshall_reward_address(rewardAddressPtr: number) {
    const addr = new RewardAddress(rewardAddressPtr, false);
    return addr.toAddress().toString();
  },
  marshall_transaction_to_cbor_hex(txPtr: number) {
    return writeTransactionToCbor(txPtr);
  },
  marshall_tx_input_set(inputSetPtr: number) {
    return readInputSet(inputSetPtr);
  },
  marshall_utxo_list_to_js(utxoListPtr: number) {
    return readUtxoList(utxoListPtr);
  }
};
