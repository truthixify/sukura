use crate::errors::SukuraError;
use crate::events::*;
use crate::state::Sukura;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

/// Handles depositing a commitment into the Merkle Tree.
///
/// This function transfers the required deposit amount from the sender to the vault,
/// ensures the commitment has not been previously used, updates the Merkle Tree,
/// and emits an event to log the deposit.
///
/// # Arguments
///
/// * `ctx` - The execution context containing the accounts involved in the deposit.
/// * `commitment` - A unique 32-byte commitment representing the deposit.
///
/// # Errors
///
/// Returns an error if the commitment has already been used.
pub fn deposit(ctx: Context<Deposit>, commitment: [u8; 32]) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let sender = &ctx.accounts.sender;
    let system_program = &ctx.accounts.system_program;

    // Ensure the commitment has not already been used to prevent duplicate deposits.
    require!(
        !pool.commitments.contains(&commitment),
        SukuraError::CommitmentAlreadyExists
    );

    // Transfer the deposit amount from the sender to the vault.
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

    // Add the commitment to the list of commitments.
    pool.commitments.push(commitment);
    let leaf_index = pool.merkle_tree.insert(commitment);
    pool.merkle_root = pool.merkle_tree.get_last_root();

    msg!(
        "Deposit successful. Sender: {}, New root: {}",
        sender.key(),
        hex::encode(pool.merkle_root)
    );

    let clock = Clock::get()?;

    // Emit a deposit event with the commitment details.
    emit!(DepositEvent {
        commitment,
        leaf_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Defines the accounts required for a deposit transaction.
#[derive(Accounts)]
pub struct Deposit<'info> {
    /// The pool account that manages deposits and withdrawals.
    #[account(
        mut,
        has_one = vault,
    )]
    pub pool: Box<Account<'info, Sukura>>,

    /// The vault account that stores deposited funds.
    /// CHECK: This account does not need additional checks because it is derived from the pool.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    /// The sender account that initiates the deposit transaction.
    #[account(mut)]
    pub sender: Signer<'info>,

    /// The pool signer account, which authorizes transactions.
    /// CHECK: This account does not need additional checks because it is derived from the pool.
    #[account(
        seeds = [
            pool.to_account_info().key.as_ref(),
        ],
        bump = pool.nonce,
    )]
    pub pool_signer: UncheckedAccount<'info>,

    /// The system program required for fund transfers.
    pub system_program: Program<'info, System>,
}
