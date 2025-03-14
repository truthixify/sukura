import 'dotenv/config' // Load environment variables from a .env file
import { Network, ShyftSdk } from '@shyft-to/js'

/**
 * Initialize the Shyft SDK with an API key and network configuration.
 * The API key is retrieved from environment variables, or a fallback key is used.
 * Network is set to Devnet for testing purposes.
 */
const shyft = new ShyftSdk({
    apiKey: process.env.API_KEY || ('pBGDMIBNQwSoU_3H' as string),
    network: Network.Devnet, // Using Solana's Devnet for testing and development
})

/**
 * Retrieves an existing relayer wallet or creates a new one if none exists.
 *
 * @returns {Promise<any>} - Returns the relayer wallet object.
 * @throws {Error} - Throws an error if the wallet retrieval or creation fails.
 */
export const getOrCreateRelayerWallet = async () => {
    try {
        const wallet = await shyft.txnRelayer.getOrCreate()
        return wallet
    } catch (err) {
        throw new Error(`Failed to get or create relayer wallet: ${err as string}`)
    }
}

/**
 * Signs a transaction using the relayer service.
 *
 * @param {string} encodedTransaction - The base64-encoded transaction to be signed.
 * @returns {Promise<string>} - The transaction signature.
 * @throws {Error} - Throws an error if signing fails.
 */
export const signTransactionWithRelayer = async (encodedTransaction: string) => {
    try {
        const signature = await shyft.txnRelayer.sign({
            network: Network.Devnet,
            encodedTransaction,
        })
        return signature
    } catch (err) {
        throw new Error(`Failed to sign transaction with relayer: ${err as string}`)
    }
}
