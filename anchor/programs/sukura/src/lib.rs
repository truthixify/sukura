#![allow(unexpected_cfgs)]

pub mod errors;
pub mod events;
pub mod instructions;
pub mod merkle_tree;
pub mod state;
pub mod verifier;

pub use errors::*;
pub use events::*;
use instructions::*;
pub use state::*;

use anchor_lang::prelude::*;

declare_id!("BAeMcGDnkVc53FFhAjPePpJRABsGS8NAehqqsYNztXJF");

#[program]
pub mod sukura {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        levels: u32,
        amount_per_withdrawal: u64,
        nonce: u8,
    ) -> Result<()> {
        initialize::initialize_pool(ctx, levels, amount_per_withdrawal, nonce)
    }

    /// Deposits a commitment into the Merkle Tree
    pub fn deposit(ctx: Context<Deposit>, commitment: [u8; 32]) -> Result<()> {
        deposit::deposit(ctx, commitment)
    }

    /// Withdraws funds by verifying the proof and nullifying the commitment
    pub fn withdraw(
        ctx: Context<Withdraw>,
        nullifier_hash: [u8; 32],
        root: [u8; 32],
        proof_data: Vec<u8>,
        fee: u64,
    ) -> Result<()> {
        withdraw::withdraw(ctx, nullifier_hash, root, proof_data, fee)
    }

    pub fn is_spent(ctx: Context<Withdraw>, nullifier_hash: [u8; 32]) -> Result<bool> {
        let pool = &mut ctx.accounts.pool;

        Ok(pool.nullifiers_hashes.contains(&nullifier_hash))
    }
}
