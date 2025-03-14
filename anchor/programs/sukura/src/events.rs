use anchor_lang::prelude::*;

/// Event emitted when a deposit is successfully made into the pool.
///
/// This event helps track deposits on-chain, allowing external applications
/// to monitor changes in the Merkle Tree state.
///
/// Fields:
/// - `commitment`: The commitment (hashed secret) of the deposit.
/// - `leaf_index`: The index at which the commitment was inserted in the Merkle Tree.
/// - `timestamp`: The Unix timestamp at which the deposit was made.
#[event]
pub struct DepositEvent {
    pub commitment: [u8; 32],
    pub leaf_index: u32,
    pub timestamp: i64,
}

/// Event emitted when a withdrawal is successfully executed.
///
/// This event ensures that each withdrawal is publicly logged and can be
/// used to track transactions while maintaining user privacy.
///
/// Fields:
/// - `recipient`: The public key of the account receiving the withdrawn funds.
/// - `nullifier_hash`: The nullifier hash used to prevent double spending.
/// - `amount`: The amount withdrawn after deducting any applicable fees.
#[event]
pub struct WithdrawEvent {
    pub recipient: Pubkey,
    pub nullifier_hash: [u8; 32],
    pub amount: u64,
}
