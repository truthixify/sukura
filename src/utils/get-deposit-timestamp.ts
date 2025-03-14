import { Connection, PublicKey } from '@solana/web3.js'

const connection = new Connection('http://127.0.0.1:8899')

export async function fetchDepositEvent(commitment: string, programId: PublicKey) {
    const signatures = await connection.getSignaturesForAddress(programId)
    console.log(signatures)
    for (const sig of signatures) {
        const tx = await connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        })
        console.log(tx?.meta)

        if (tx && tx.meta && tx.meta.logMessages) {
            for (const log of tx.meta.logMessages) {
                if (log.includes('DepositEvent')) {
                    console.log('Found event log:', log)

                    if (log.includes(commitment)) {
                        console.log('Matching event found:', log)
                        return log
                    }
                }
            }
        }
    }
    console.log('No matching event found.')
}
