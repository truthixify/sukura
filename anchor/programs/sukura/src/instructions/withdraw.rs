use crate::errors::SukuraError;
use crate::events::*;
use crate::state::Sukura;
use crate::verifier::verify_proof;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

/// Handles the withdrawal process, ensuring proof verification and preventing double-spending.
///
/// # Arguments
/// * `ctx` - The transaction context containing accounts involved in the withdrawal.
/// * `nullifier_hash` - A unique hash preventing double withdrawals.
/// * `root` - The Merkle tree root proving the commitment's inclusion.
/// * `proof_data` - Zero-knowledge proof data verifying the legitimacy of the withdrawal.
/// * `fee` - Fee deducted from the withdrawal amount and sent to the relayer.
///
/// # Returns
/// * `Result<()>` - Returns `Ok(())` if the withdrawal is successful, otherwise returns an error.
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

    // Ensure the nullifier has not been used before to prevent double spending.
    require!(
        !pool.nullifiers_hashes.contains(&nullifier_hash),
        SukuraError::NullifierAlreadyUsed
    );

    // Verify that the provided root exists in the Merkle tree.
    require!(
        pool.merkle_tree.is_known_root(root),
        SukuraError::RootNotFound
    );

    // Verify the proof to ensure a valid withdrawal request.
    let proof_result = verify_proof(&proof_data).map_err(|_| SukuraError::InvalidProof)?;
    require!(proof_result, SukuraError::InvalidProof);

    let bump = pool.nonce;
    let pool_seeds = &[pool.to_account_info().key.as_ref(), &[bump]];
    let amount = pool.amount_per_withdrawal - fee;

    // Transfer the withdrawal amount to the recipient.
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

    // Transfer the fee to the relayer.
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

    // Store the nullifier to prevent reuse.
    pool.nullifiers_hashes.push(nullifier_hash);

    // Emit a withdraw event with the recipient, nullifier hash and amount.
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
    /// The pool account managing the Merkle tree and funds.
    #[account(
        mut,
        has_one = vault,
    )]
    pub pool: Box<Account<'info, Sukura>>,
    /// CHECK: This is the vault account, which holds the funds for withdrawals.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: The recipient of the withdrawn funds.
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    /// CHECK: The pool's derived signer account, used to authorize transfers.
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
    /// System program required for executing transfers.
    pub system_program: Program<'info, System>,
}
