/**
 * Handles errors returned by Anchor-based Solana programs.
 *
 * This function extracts custom error codes from the error message and maps them
 * to human-readable error descriptions. If no matching error code is found, it
 * returns a generic "Transaction failed" message.
 *
 * @param {any} err - The error object thrown during the transaction.
 * @returns {string | undefined} A user-friendly error message, or `undefined` if no match is found.
 */
export function handleAnchorError(err: any): string | undefined {
    // Check if the error message contains a custom error from the Anchor framework
    if (err.message.includes('Custom')) {
        const match = err.message.match(/Custom":(\d+)/) // Extract error code

        if (match) {
            const errorCode = parseInt(match[1], 10) // Convert extracted error code to an integer

            // Map error codes to user-friendly messages
            switch (errorCode) {
                case 6000:
                    return 'Commitment already exists'
                case 6001:
                    return 'Nullifier already used'
                case 6002:
                    return 'Merkle root not found'
                case 6003:
                    return 'Invalid proof provided for withdrawal'
                default:
                    return 'Transaction failed' // Default message for unrecognized error codes
            }
        }
    }

    return undefined // Return undefined if no error code is found
}
