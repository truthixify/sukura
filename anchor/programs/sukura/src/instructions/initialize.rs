use crate::merkle_tree::MerkleTreeWithHistory;
use crate::state::Sukura;
use anchor_lang::prelude::*;

pub fn initialize_pool(
    ctx: Context<InitializePool>,
    levels: u32,
    amount_per_withdrawal: u64,
    nonce: u8,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    pool.nonce = nonce;
    pool.vault = ctx.accounts.vault.key();

    pool.merkle_tree = MerkleTreeWithHistory::new(levels);
    pool.merkle_root = pool.merkle_tree.get_last_root();
    pool.amount_per_withdrawal = amount_per_withdrawal;
    pool.commitments = Vec::new();
    pool.nullifiers_hashes = Vec::new();

    msg!("Sukura initialized with nonce: {}", nonce);
    msg!(
        "Sukura initialized with withdrawal amount: {}",
        amount_per_withdrawal
    );
    msg!("Vault address: {}", pool.vault);

    Ok(())
}

#[derive(Accounts)]
#[instruction(levels: u32, amount_per_withdrawal: u64, nonce: u8)]
pub struct InitializePool<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = Sukura::SPACE
    )]
    pub pool: Box<Account<'info, Sukura>>,
    /// CHECK: This is the pool signer, and it does not need to be checked because it is derived from the pool's address and nonce
    #[account(
        seeds = [
            pool.key().as_ref(),
        ],
        bump = nonce,
    )]
    pub pool_signer: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [pool.key().as_ref()],
        bump = nonce
    )]
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
