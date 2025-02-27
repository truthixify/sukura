import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js'

const getSimulationComputeUnits = async (
    connection: Connection,
    instructions: TransactionInstruction[],
    payer: PublicKey
): Promise<number | undefined> => {
    const testInstructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ...instructions,
    ]

    const testVersionedTxn = new VersionedTransaction(
        new TransactionMessage({
            instructions: testInstructions,
            payerKey: payer,
            recentBlockhash: PublicKey.default.toString(),
        }).compileToV0Message()
    )

    const simulation = await connection.simulateTransaction(testVersionedTxn, {
        replaceRecentBlockhash: true,
        sigVerify: false,
    })

    if (simulation.value.err) {
        return undefined
    }

    return simulation.value.unitsConsumed
}

export const getComputeUnitsIx = async (
    connection: Connection,
    instructions: TransactionInstruction[],
    payer: PublicKey
): Promise<TransactionInstruction> => {
    const simulatedComputeUnits = await getSimulationComputeUnits(connection, instructions, payer)
    const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: (simulatedComputeUnits as number) + 10_000 || 500_000,
    })

    return computeUnitsIx
}
