mod merkle_tree;
mod verifier;

use anchor_lang::prelude::*;
use merkle_tree::MerkleTreeWithHistory;
use verifier::verify_proof;

declare_id!("8t4Cy8257wFwzD1bPd7d8d4x2YoGQJnDvQNXhLUDrWK9");

#[program]
pub mod sukura {
    use super::*;

    /// Initializes the SukuraPool with default values
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        levels: u32,
        amount_per_withdrawal: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        pool.merkle_tree = MerkleTreeWithHistory::new(levels);
        pool.merkle_root = pool.merkle_tree.get_last_root();
        pool.amount_per_withdrawal = amount_per_withdrawal;

        msg!(
            "SukuraPool initialized with withdrawal amount: {}",
            amount_per_withdrawal
        );
        Ok(())
    }

    /// Deposits a commitment into the Merkle Tree
    pub fn deposit(ctx: Context<Deposit>, commitment: [u8; 32]) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        require!(
            !pool.commitments.contains(&commitment),
            SukuraError::CommitmentAlreadyExists
        );

        pool.commitments.push(commitment);
        pool.merkle_tree.insert(commitment);
        pool.merkle_root = pool.merkle_tree.get_last_root();

        msg!(
            "Deposit successful. New root: {}",
            hex::encode(pool.merkle_root)
        );
        Ok(())
    }

    /// Withdraws funds by verifying the proof and nullifying the commitment
    pub fn withdraw(
        ctx: Context<Withdraw>,
        nullifier: [u8; 32],
        proof_data: Vec<u8>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        require!(
            !pool.nullifiers.contains(&nullifier),
            SukuraError::NullifierAlreadyUsed
        );

        let proof_result = verify_proof(&proof_data).map_err(|_| SukuraError::InvalidProof)?;

        // Verify proof
        require!(proof_result, SukuraError::InvalidProof);

        pool.nullifiers.push(nullifier);

        **ctx
            .accounts
            .recipient
            .to_account_info()
            .try_borrow_mut_lamports()? += pool.amount_per_withdrawal;

        msg!(
            "Withdrawal successful. Amount: {}",
            pool.amount_per_withdrawal
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(init, payer = authority, space = 8 + std::mem::size_of::<SukuraPool>())]
    pub pool: Account<'info, SukuraPool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pool: Account<'info, SukuraPool>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub pool: Account<'info, SukuraPool>,
    #[account(mut)]
    pub recipient: Signer<'info>,
}

#[account]
pub struct SukuraPool {
    pub merkle_tree: MerkleTreeWithHistory, // Stores commitments as Merkle Tree leaves
    pub merkle_root: [u8; 32],              // The current root of the Merkle Tree
    pub commitments: Vec<[u8; 32]>,         // Track deposits to prevent duplicates
    pub nullifiers: Vec<[u8; 32]>,          // Track used nullifiers to prevent double spending
    pub amount_per_withdrawal: u64,         // Fixed withdrawal amount
}

#[event]
pub struct DepositEvent {
    pub commitment: String,
    pub merkle_root: String,
}

#[event]
pub struct WithdrawalEvent {
    pub recipient: Pubkey,
    pub nullifier: String,
    pub merkle_root: String,
}

#[error_code]
pub enum SukuraError {
    #[msg("Commitment already exists in the Merkle Tree")]
    CommitmentAlreadyExists,

    #[msg("Nullifier has already been used")]
    NullifierAlreadyUsed,

    #[msg("Invalid proof provided for withdrawal")]
    InvalidProof,
}