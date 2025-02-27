#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod sukura {
    use super::*;

  pub fn close(_ctx: Context<CloseSukura>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.sukura.count = ctx.accounts.sukura.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.sukura.count = ctx.accounts.sukura.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeSukura>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.sukura.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeSukura<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + Sukura::INIT_SPACE,
  payer = payer
  )]
  pub sukura: Account<'info, Sukura>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseSukura<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub sukura: Account<'info, Sukura>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub sukura: Account<'info, Sukura>,
}

#[account]
#[derive(InitSpace)]
pub struct Sukura {
  count: u8,
}
