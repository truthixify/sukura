#![allow(unexpected_cfgs)]

/// Module containing custom error definitions.
pub mod errors;
/// Module containing event definitions.
pub mod events;
/// Module containing instruction handlers.
pub mod instructions;
/// Module implementing the Merkle Tree structure.
pub mod merkle_tree;
/// Module defining the on-chain state structures.
pub mod state;
/// Module implementing the proof verification logic.
pub mod verifier;

// Re-export commonly used modules
pub use errors::*;
pub use events::*;
use instructions::*;
pub use state::*;

use anchor_lang::prelude::*;

// Program identifier for the Sukura smart contract.
declare_id!("ApGPiDBBy3xTuB76W8jobeooVgxpV3X7meWW4LpFsEx9");

#[program]
pub mod sukura {
    use super::*;

    /// Initializes a new pool with a given Merkle Tree depth, fixed withdrawal amount, and a nonce for pool identification.
    ///
    /// # Arguments
    /// * `ctx` - The context containing relevant accounts.
    /// * `levels` - Depth of the Merkle Tree.
    /// * `amount_per_withdrawal` - The fixed withdrawal amount per transaction.
    /// * `nonce` - A unique identifier for the pool.
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        levels: u32,
        amount_per_withdrawal: u64,
        nonce: u8,
    ) -> Result<()> {
        initialize::initialize_pool(ctx, levels, amount_per_withdrawal, nonce)
    }

    /// Deposits a new commitment into the Merkle Tree.
    ///
    /// # Arguments
    /// * `ctx` - The transaction context.
    /// * `commitment` - A 32-byte commitment to be stored in the tree.
    pub fn deposit(ctx: Context<Deposit>, commitment: [u8; 32]) -> Result<()> {
        deposit::deposit(ctx, commitment)
    }

    /// Withdraws funds by verifying a zero-knowledge proof and nullifying the spent commitment.
    ///
    /// # Arguments
    /// * `ctx` - The transaction context.
    /// * `nullifier_hash` - A 32-byte nullifier hash used to track spent commitments.
    /// * `root` - The Merkle Root at the time of withdrawal.
    /// * `proof_data` - A serialized zero-knowledge proof verifying the legitimacy of the withdrawal.
    /// * `fee` - The transaction fee deducted from the withdrawal.
    pub fn withdraw(
        ctx: Context<Withdraw>,
        nullifier_hash: [u8; 32],
        root: [u8; 32],
        proof_data: Vec<u8>,
        fee: u64,
    ) -> Result<()> {
        withdraw::withdraw(ctx, nullifier_hash, root, proof_data, fee)
    }

    /// Checks whether a given nullifier hash has already been spent.
    ///
    /// # Arguments
    /// * `ctx` - The transaction context.
    /// * `nullifier_hash` - A 32-byte hash representing a previously used commitment.
    ///
    /// # Returns
    /// * `Ok(true)` if the nullifier has been spent, otherwise `Ok(false)`.
    pub fn is_spent(ctx: Context<Withdraw>, nullifier_hash: [u8; 32]) -> Result<bool> {
        let pool = &mut ctx.accounts.pool;

        Ok(pool.nullifiers_hashes.contains(&nullifier_hash))
    }
}
