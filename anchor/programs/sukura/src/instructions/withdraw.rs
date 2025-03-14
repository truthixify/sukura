use crate::errors::SukuraError;
use crate::events::*;
use crate::state::Sukura;
use crate::verifier::verify_proof;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

pub fn withdraw(
    ctx: Context<Withdraw>,
    nullifier_hash: [u8; 32],
    root: [u8; 32],
    proof_data: Vec<u8>,
    fee: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let recipient = &ctx.accounts.recipient;
    let system_program = &ctx.accounts.system_program;
    let relayer = &ctx.accounts.relayer;

    require!(
        !pool.nullifiers_hashes.contains(&nullifier_hash),
        SukuraError::NullifierAlreadyUsed
    );

    require!(
        pool.merkle_tree.is_known_root(root),
        SukuraError::RootNotFound
    );

    let proof_result = verify_proof(&proof_data).map_err(|_| SukuraError::InvalidProof)?;

    require!(proof_result, SukuraError::InvalidProof);

    let bump = pool.nonce;
    let pool_seeds = &[pool.to_account_info().key.as_ref(), &[bump]];
    let amount = pool.amount_per_withdrawal - fee;

    // send amount recipient
    transfer(
        CpiContext::new(
            system_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: recipient.to_account_info(),
            },
        )
        .with_signer(&[pool_seeds]),
        amount,
    )?;

    // send fee to relayer
    transfer(
        CpiContext::new(
            system_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: relayer.to_account_info(),
            },
        )
        .with_signer(&[pool_seeds]),
        fee,
    )?;

    pool.nullifiers_hashes.push(nullifier_hash);

    emit!(WithdrawEvent {
        recipient: recipient.key(),
        nullifier_hash,
        amount,
    });

    msg!(
        "Withdrawal successful. Amount: {}",
        pool.amount_per_withdrawal
    );

    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = vault,
    )]
    pub pool: Box<Account<'info, Sukura>>,
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: This is the recipient of the fund.
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    #[account(
        seeds = [
            pool.to_account_info().key.as_ref(),
        ],
        bump = pool.nonce,
    )]
    pub pool_signer: UncheckedAccount<'info>,
    /// CHECK: The relayer account paying gas fee.
    #[account(mut)]
    pub relayer: AccountInfo<'info>, 
    pub system_program: Program<'info, System>,
}
