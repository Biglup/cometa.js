import { PlutusData } from './PlutusData';
import { Script } from './Script';
import { Value } from './Value';

/**
 * Represents a transaction output in the Cardano blockchain.
 * A transaction output is a piece of data that specifies where ADA and/or native tokens are sent,
 * along with additional information such as datum and script references.
 */
export interface TxOut {
  /**
   * The address to which this output is sent. This can be a base address, a pointer address, or a script address.
   */
  address: string;

  /**
   * The amount of ADA and/or native tokens contained in this output.
   */
  value: Value;

  /**
   * Datum hash, this allows to specify a Datum without publicly revealing its value. To spend an output which specifies
   * this type of datum, the actual Datum value must be provided and will be added to the witness set of
   * the transaction.
   */
  datumHash?: string;

  /**
   * The datum value can also be inlined in the output revealing the value on the blockchain at the time of output
   * creation. This way of attaching datums lets users consume this output without specifying the datum value.
   */
  datum?: PlutusData;

  /**
   * Reference scripts can be used to satisfy script requirements during validation, rather than requiring the spending
   * transaction to do so. This allows transactions using common scripts to be much smaller.
   *
   * The key idea is to use reference inputs and outputs which carry actual scripts ("reference scripts"), and allow
   * such reference scripts to satisfy the script witnessing requirement for a transaction. This means that the
   * transaction which uses the script will not need to provide it at all, so long as it referenced an output
   * which contained the script.
   */
  scriptReference?: Script;
}
