import { Connection } from '@solana/web3.js'

export const confirmTransaction = async (
    connection: Connection,
    signature: string,
    maxRetries = 3,
    delay = 1000
) => {
    for (let i = 0; i < maxRetries; i++) {
        const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
        })

        if (
            status?.value?.confirmationStatus === 'confirmed' ||
            status?.value?.confirmationStatus === 'finalized'
        ) {
            return true
        }

        await new Promise((res) => setTimeout(res, delay))
    }

    throw new Error(`Transaction not found or still pending:', ${signature}`)
    return false
}
