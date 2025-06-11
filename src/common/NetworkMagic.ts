/**
 * \brief Enumerates the available Cardano network environments.
 *
 * This enumeration defines the different network environments that can be used
 * with the Cardano provider.
 */
export enum NetworkMagic {
  /**
   * \brief The Pre-Production test network.
   *
   * The Pre-Production network is a Cardano testnet used for testing features
   * before they are deployed to the Mainnet. It closely mirrors the Mainnet
   * environment, providing a final testing ground for applications.
   */
  PREPROD = 1,

  /**
   * \brief The Preview test network.
   *
   * The Preview network is a Cardano testnet used for testing upcoming features
   * before they are released to the Pre-Production network. It allows developers
   * to experiment with new functionalities in a controlled environment.
   */
  PREVIEW = 2,

  /**
   * \brief The SanchoNet test network.
   *
   * SanchoNet is the testnet for rolling out governance features for the Cardano blockchain,
   * aligning with the comprehensive CIP-1694 specifications.
   */
  SANCHONET = 4,

  /**
   * \brief The Mainnet network.
   *
   * The Mainnet is the live Cardano network where real transactions occur.
   * Applications interacting with the Mainnet are dealing with actual ADA and
   * other assets. Caution should be exercised to ensure correctness and security.
   */
  MAINNET = 764824073
}
