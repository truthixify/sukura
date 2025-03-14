use crate::merkle_tree::MerkleTreeWithHistory;
use crate::state::Sukura;
use anchor_lang::prelude::*;

/// A hardcoded public key used for initializing the pool.
/// This ensures only the predefined authority can create a new pool.
const HARDCODED_PUBKEY: Pubkey = pubkey!("3pzgiv8AQotxN6UVCVv9zVQ2qsf4Dx3LZY6ixZGau9M7");

/// Initializes a new Sukura pool.
///
/// This function sets up the initial state of the pool, including the Merkle Tree structure,
/// withdrawal parameters, and tracking of commitments and nullifier hashes.
///
/// # Arguments
/// * `ctx` - The execution context, providing access to accounts.
/// * `levels` - The number of levels in the Merkle Tree.
/// * `amount_per_withdrawal` - The fixed amount that can be withdrawn per transaction.
/// * `nonce` - A unique identifier to derive signer accounts.
///
/// # Returns
/// Returns `Ok(())` if the pool is successfully initialized.
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    levels: u32,
    amount_per_withdrawal: u64,
    nonce: u8,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Set the nonce for deriving the pool signer
    pool.nonce = nonce;

    // Assign the vault's public key
    pool.vault = ctx.accounts.vault.key();

    // Initialize the Merkle Tree structure with the specified depth
    pool.merkle_tree = MerkleTreeWithHistory::new(levels);

    // Set the initial Merkle Tree root
    pool.merkle_root = pool.merkle_tree.get_last_root();

    // Set the withdrawal amount per transaction
    pool.amount_per_withdrawal = amount_per_withdrawal;

    // Initialize empty lists for commitments and nullifier hashes
    pool.commitments = Vec::new();
    pool.nullifiers_hashes = Vec::new();

    // Logging for debugging purposes
    msg!("Sukura initialized with nonce: {}", nonce);
    msg!(
        "Sukura initialized with withdrawal amount: {}",
        amount_per_withdrawal
    );
    msg!("Vault address: {}", pool.vault);

    Ok(())
}

/// Accounts required for initializing the Sukura pool.
///
/// This struct defines the accounts necessary for the pool initialization,
/// including the authority, pool storage, vault, and system program.
#[derive(Accounts)]
#[instruction(levels: u32, amount_per_withdrawal: u64, nonce: u8)]
pub struct InitializePool<'info> {
    /// The account authorized to create the pool.
    ///
    /// This must match the predefined `HARDCODED_PUBKEY` to ensure only
    /// the designated entity can initialize the pool.
    #[account(mut)]
    #[account(address = HARDCODED_PUBKEY)]
    authority: Signer<'info>,

    /// The account storing the Sukura pool state.
    ///
    /// This account is initialized and paid for by the authority.
    #[account(
        init,
        payer = authority,
        space = Sukura::SPACE
    )]
    pub pool: Box<Account<'info, Sukura>>,

    /// The pool signer account derived from the pool’s public key and nonce.
    ///
    /// This account serves as the authority for executing transactions within the pool.
    /// CHECK: No need to validate since it's derived from the pool's address and nonce.
    #[account(
        seeds = [
            pool.key().as_ref(),
        ],
        bump = nonce,
    )]
    pub pool_signer: UncheckedAccount<'info>,

    /// The vault account where deposited funds are stored.
    ///
    /// This account is derived from the pool's public key and nonce.
    /// CHECK: No need to validate as it's deterministically derived.
    #[account(
        mut,
        seeds = [pool.key().as_ref()],
        bump = nonce
    )]
    pub vault: AccountInfo<'info>,

    /// The Solana system program.
    pub system_program: Program<'info, System>,
}
