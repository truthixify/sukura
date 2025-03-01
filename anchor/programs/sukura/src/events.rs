use anchor_lang::prelude::*;

#[event]
pub struct DepositEvent {
    pub commitment: [u8; 32],
    pub leaf_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub recipient: Pubkey,
    pub nullifier_hash: [u8; 32],
    pub amount: u64,
}
