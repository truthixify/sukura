use anchor_lang::prelude::*;

#[error_code]
pub enum SukuraError {
    #[msg("Commitment already exists in the merkle tree")]
    CommitmentAlreadyExists,

    #[msg("Nullifier has already been used")]
    NullifierAlreadyUsed,

    #[msg("Root not found in the merkle tree")]
    RootNotFound,

    #[msg("Invalid proof provided for withdrawal")]
    InvalidProof,
}
