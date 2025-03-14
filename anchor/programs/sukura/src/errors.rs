use anchor_lang::prelude::*;

/// Custom error codes for the Sukura program.
///
/// These errors are used to enforce business logic rules and ensure the integrity
/// of deposits, withdrawals, and Merkle Tree operations.
#[error_code]
pub enum SukuraError {
    /// Error thrown when attempting to deposit a commitment that already exists in the Merkle Tree.
    ///
    /// This prevents duplicate commitments, which could otherwise disrupt the integrity
    /// of the pool and Merkle Tree structure.
    #[msg("Commitment already exists in the merkle tree")]
    CommitmentAlreadyExists,

    /// Error thrown when a withdrawal is attempted using a nullifier that has already been used.
    ///
    /// This prevents double spending by ensuring that each nullifier is only used once.
    #[msg("Nullifier has already been used")]
    NullifierAlreadyUsed,

    /// Error thrown when the specified Merkle Tree root is not found.
    ///
    /// This ensures that only valid roots from the tree’s history can be used in withdrawal proofs.
    #[msg("Root not found in the merkle tree")]
    RootNotFound,

    /// Error thrown when an invalid cryptographic proof is provided for withdrawal.
    ///
    /// This ensures that only properly verified zero-knowledge proofs can be used to withdraw funds.
    #[msg("Invalid proof provided for withdrawal")]
    InvalidProof,
}
