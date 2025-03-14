import { Connection } from '@solana/web3.js'

/**
 * Confirms whether a given Solana transaction has been successfully processed.
 *
 * @param {Connection} connection - The Solana blockchain connection instance.
 * @param {string} signature - The transaction signature to check.
 * @param {number} [maxRetries=10] - Maximum number of retries before giving up.
 * @param {number} [delay=500] - Delay (in milliseconds) between each retry attempt.
 *
 * @returns {Promise<boolean>} - Resolves to `true` if the transaction is confirmed or finalized.
 * @throws {Error} - Throws an error if the transaction remains unconfirmed after all retries.
 */
export const confirmTransaction = async (
    connection: Connection,
    signature: string,
    maxRetries = 10,
    delay = 500
) => {
    for (let i = 0; i < maxRetries; i++) {
        // Fetch the transaction's status from the blockchain
        const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true, // Ensures it searches in historical transactions
        })

        // Check if the transaction is confirmed or finalized
        if (
            status?.value?.confirmationStatus === 'confirmed' ||
            status?.value?.confirmationStatus === 'finalized'
        ) {
            return true // Transaction successfully confirmed
        }

        // Wait before retrying to avoid overloading the network
        await new Promise((res) => setTimeout(res, delay))
    }

    // Throw an error if transaction is still unconfirmed after all retries
    throw new Error(`Transaction not found or still pending: ${signature}`)
}
