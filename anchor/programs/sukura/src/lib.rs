mod merkle_tree;
mod verifier;

use anchor_lang::prelude::*;
use merkle_tree::MerkleTreeWithHistory;
use verifier::verify_proof;

declare_id!("7g6rj2p3kSAA3oyoAgsZQ8z9aB2YGJZ5t1nu5duwrjev");

#[program]
pub mod sukura {
    use anchor_lang::system_program::{transfer, Transfer};

    use super::*;

    /// Initializes the Sukura with default values
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

    /// Deposits a commitment into the Merkle Tree
    pub fn deposit(ctx: Context<Deposit>, commitment: [u8; 32]) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let vault = &mut ctx.accounts.vault;
        let sender = &ctx.accounts.sender;
        let system_program = &ctx.accounts.system_program;

        require!(
            !pool.commitments.contains(&commitment),
            SukuraError::CommitmentAlreadyExists
        );

        // Transfer SOL from sender to vault
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

        let clock = Clock::get()?; // Get the Solana block timestamp

        emit!(DepositEvent {
            commitment,
            leaf_index,
            timestamp: clock.unix_timestamp, // Add timestamp
        });

        Ok(())
    }

    /// Withdraws funds by verifying the proof and nullifying the commitment
    pub fn withdraw(
        ctx: Context<Withdraw>,
        nullifier_hash: [u8; 32],
        root: [u8; 32],
        proof_data: Vec<u8>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let vault = &mut ctx.accounts.vault;
        let recipient = &ctx.accounts.recipient;
        let system_program = &ctx.accounts.system_program;

        require!(
            !pool.nullifiers_hashes.contains(&nullifier_hash),
            SukuraError::NullifierAlreadyUsed
        );

        require!(
            pool.merkle_tree.is_known_root(root),
            SukuraError::RootNotFound
        );

        let proof_result = verify_proof(&proof_data).map_err(|_| SukuraError::InvalidProof)?;

        // Verify proof
        require!(proof_result, SukuraError::InvalidProof);

        let bump = pool.nonce;
        let pool_seeds = &[pool.to_account_info().key.as_ref(), &[bump]];

        transfer(
            CpiContext::new(
                system_program.to_account_info(),
                Transfer {
                    from: vault.to_account_info(),
                    to: recipient.to_account_info(),
                },
            )
            .with_signer(&[pool_seeds]),
            pool.amount_per_withdrawal,
        )?;

        pool.nullifiers_hashes.push(nullifier_hash);

        emit!(WithdrawEvent {
            recipient: recipient.key(),
            nullifier_hash,
            amount: pool.amount_per_withdrawal,
        });

        msg!(
            "Withdrawal successful. Amount: {}",
            pool.amount_per_withdrawal
        );

        Ok(())
    }

    pub fn is_spent(ctx: Context<Withdraw>, nullifier_hash: [u8; 32]) -> Result<bool> {
        let pool = &mut ctx.accounts.pool;

        Ok(pool.nullifiers_hashes.contains(&nullifier_hash))
    }
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
    pool: Box<Account<'info, Sukura>>,
    /// CHECK: This is the pool signer, and it does not need to be checked because it is derived from the pool's address and nonce
    #[account(
        seeds = [
            pool.key().as_ref(),
        ],
        bump = nonce,
    )]
    pool_signer: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [pool.key().as_ref()],
        bump = nonce
    )]
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    vault: AccountInfo<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        has_one = vault,
    )]
    pool: Box<Account<'info, Sukura>>,
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    #[account(mut)]
    vault: UncheckedAccount<'info>,
    #[account(mut)]
    sender: Signer<'info>,
    /// CHECK: This is the pool signer, and it does not need to be checked because it is derived from the pool's address and nonce
    #[account(
        seeds = [
            pool.to_account_info().key.as_ref(),
        ],
        bump = pool.nonce,
    )]
    pool_signer: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = vault,
    )]
    pool: Box<Account<'info, Sukura>>,
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    #[account(mut)]
    vault: UncheckedAccount<'info>,
    /// CHECK: This is the recipient of the fund.
    #[account(mut)]
    recipient: AccountInfo<'info>,
    /// CHECK: This is the vault account, and it does not need to be checked because it is derived from the pool's address and nonce.
    #[account(
        seeds = [
            pool.to_account_info().key.as_ref(),
        ],
        bump = pool.nonce,
    )]
    pool_signer: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
}

#[account]
pub struct Sukura {
    pub merkle_tree: MerkleTreeWithHistory, // Stores commitments as Merkle Tree leaves
    pub merkle_root: [u8; 32],              // The current root of the Merkle Tree
    pub commitments: Vec<[u8; 32]>,         // Track deposits to prevent duplicates
    pub nullifiers_hashes: Vec<[u8; 32]>,   // Track used nullifiers to prevent double spending
    pub amount_per_withdrawal: u64,         // Fixed withdrawal amount
    pub nonce: u8,                          // Nonce for identifying pools
    pub vault: Pubkey,                      // Vault for storing funds
}

impl Sukura {
    // merkle_tree space calculation
    // levels => 4 bytes
    // max_levels = 32
    // filled_subtrees => 32 * 32 + 24 (metadata overhead) = 1048 bytes
    // roots => 32 * 32 = 1024 + 24 (metadat overhead) = 1024 + 24 = 1048 bytes
    // current_root_index => 8 bytes
    // next_index => 4 bytes
    // merkle_tree => 2112 bytes
    // merkle_root => 32 bytes
    // commitments => 32 * 32 + 24 = 1048 bytes
    // nullifiers => 32 * 32 + 24 = 1048 bytes
    // amount_per_withdrawal => 8 bytes
    // nonce => 4 bytes
    // vault => 32 bytes
    // total => merkle_tree + merkle_root + commitments + nullifiers + amount_per_withdrawal + nonce + vault = 2112 + 32 + 1048 + 1048 + 8 + 4 + 32 = 4224 bytes
    pub const SPACE: usize = 8 + 4224;
}

#[event]
pub struct DepositEvent {
    pub commitment: [u8; 32],
    pub leaf_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub recipient: Pubkey,
    pub nullifier_hash: [u8; 32],
    amount: u64,
}

#[error_code]
pub enum SukuraError {
    #[msg("Commitment already exists in the Merkle Tree")]
    CommitmentAlreadyExists,

    #[msg("Nullifier has already been used")]
    NullifierAlreadyUsed,

    #[msg("Root not found in the merkle tree")]
    RootNotFound,

    #[msg("Invalid proof provided for withdrawal")]
    InvalidProof,
}

#[cfg(test)]
mod tests {
    use super::*;
    use verifier::verify_proof;

    const DATA: [u8; 224] = [
        32, 72, 54, 233, 138, 83, 5, 160, 97, 207, 200, 110, 227, 108, 166, 85, 238, 83, 51, 223,
        255, 40, 224, 156, 85, 14, 201, 43, 143, 8, 115, 114, 8, 146, 148, 10, 175, 55, 48, 207, 3,
        250, 214, 35, 88, 4, 159, 23, 6, 111, 236, 38, 202, 62, 134, 130, 45, 239, 203, 237, 26,
        176, 19, 127, 3, 36, 206, 74, 154, 228, 24, 249, 124, 159, 195, 148, 109, 14, 52, 227, 190,
        55, 189, 68, 16, 97, 13, 116, 80, 207, 49, 208, 50, 158, 57, 71, 33, 166, 201, 155, 31, 6,
        171, 104, 219, 89, 145, 86, 11, 15, 11, 204, 97, 118, 183, 80, 125, 179, 79, 78, 181, 180,
        143, 98, 92, 203, 254, 42, 10, 205, 51, 235, 96, 195, 68, 23, 173, 207, 209, 88, 250, 75,
        125, 111, 14, 28, 74, 136, 184, 185, 249, 24, 148, 200, 24, 51, 106, 185, 167, 74, 11, 248,
        76, 45, 221, 178, 88, 252, 184, 180, 184, 182, 136, 232, 235, 6, 206, 94, 96, 7, 86, 44, 6,
        183, 214, 232, 233, 138, 129, 141, 86, 140, 25, 49, 223, 181, 17, 155, 126, 187, 91, 175,
        75, 241, 243, 127, 25, 226, 156, 45, 51, 169, 207, 194, 178, 41, 193, 117, 229, 2, 113,
        244, 24, 199,
    ];

    #[test]
    fn test_proof() {
        assert!(verify_proof(&DATA).unwrap())
    }
}
