use crate::errors::SukuraError;
use crate::events::*;
use crate::state::Sukura;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

pub fn deposit(ctx: Context<Deposit>, commitment: [u8; 32]) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let sender = &ctx.accounts.sender;
    let system_program = &ctx.accounts.system_program;

    require!(
        !pool.commitments.contains(&commitment),
        SukuraError::CommitmentAlreadyExists
    );

    transfer(
        CpiContext::new(
            system_program.to_account_info(),
            Transfer {
                from: sender.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        pool.amount_per_withdrawal,
    )?;

    pool.commitments.push(commitment);
    let leaf_index = pool.merkle_tree.insert(commitment);
    pool.merkle_root = pool.merkle_tree.get_last_root();

    msg!(
        "Deposit successful. Sender: {}, New root: {}",
        sender.key(),
        hex::encode(pool.merkle_root)
    );

    let clock = Clock::get()?;

    emit!(DepositEvent {
        commitment,
        leaf_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        has_one = vault,
    )]
    pub pool: Box<Account<'info, Sukura>>,
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: This is the pool signer, and it does not need to be checked because it is derived from the pool's address and nonce
    #[account(
        seeds = [
            pool.to_account_info().key.as_ref(),
        ],
        bump = pool.nonce,
    )]
    pub pool_signer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
