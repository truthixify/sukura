import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js'

/**
 * Estimates the compute units required for a given set of transaction instructions.
 *
 * This function simulates the execution of a transaction containing the provided instructions
 * to determine the amount of compute units consumed. It sets an initial limit of 1,400,000 units
 * and executes the simulation on the given Solana connection.
 *
 * @param {Connection} connection - The Solana RPC connection to use for simulation.
 * @param {TransactionInstruction[]} instructions - The transaction instructions to simulate.
 * @param {PublicKey} payer - The public key of the transaction payer.
 * @returns {Promise<number | undefined>} - The number of compute units consumed, or `undefined` if an error occurs.
 */
const getSimulationComputeUnits = async (
    connection: Connection,
    instructions: TransactionInstruction[],
    payer: PublicKey
): Promise<number | undefined> => {
    try {
        // Add a ComputeBudgetProgram instruction to limit compute units for simulation
        const testInstructions = [
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
            ...instructions,
        ]

        // Create a VersionedTransaction with the provided instructions
        const testVersionedTxn = new VersionedTransaction(
            new TransactionMessage({
                instructions: testInstructions,
                payerKey: payer,
                recentBlockhash: PublicKey.default.toString(), // Placeholder blockhash for simulation
            }).compileToV0Message()
        )

        // Simulate the transaction execution without verifying the signature
        const simulation = await connection.simulateTransaction(testVersionedTxn, {
            replaceRecentBlockhash: true,
            sigVerify: false,
        })

        // Return undefined if an error occurs during simulation
        if (simulation.value.err) {
            return undefined
        }

        // Return the number of compute units consumed
        return simulation.value.unitsConsumed
    } catch (err) {
        throw err // Rethrow any errors encountered
    }
}

/**
 * Generates a ComputeBudgetProgram instruction to optimize compute unit allocation.
 *
 * This function first simulates the execution of the given transaction instructions to determine
 * the estimated compute units required. It then creates a `setComputeUnitLimit` instruction
 * with a buffer of 10,000 units to ensure sufficient compute allocation.
 *
 * @param {Connection} connection - The Solana RPC connection.
 * @param {TransactionInstruction[]} instructions - The transaction instructions to execute.
 * @param {PublicKey} payer - The public key of the transaction payer.
 * @returns {Promise<TransactionInstruction>} - A TransactionInstruction for setting compute unit limits.
 */
export const getComputeUnitsIx = async (
    connection: Connection,
    instructions: TransactionInstruction[],
    payer: PublicKey
): Promise<TransactionInstruction> => {
    try {
        // Estimate the compute units needed using simulation
        const simulatedComputeUnits = await getSimulationComputeUnits(
            connection,
            instructions,
            payer
        )

        // Set the compute unit limit slightly above the simulated usage (default to 500,000 if undefined)
        const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
            units: (simulatedComputeUnits as number) + 10_000 || 500_000,
        })

        return computeUnitsIx
    } catch (err) {
        throw err // Rethrow any errors encountered
    }
}
