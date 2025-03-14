use crate::merkle_tree::MerkleTreeWithHistory;
use anchor_lang::prelude::*;

/// The `Sukura` account struct represents a shielded pool for private transactions.
/// It maintains a Merkle tree for commitments, nullifier hashes to prevent double spending,
/// and various other fields related to withdrawals and fund storage.
#[account]
pub struct Sukura {
    /// The Merkle tree used to store commitments as leaves.
    pub merkle_tree: MerkleTreeWithHistory,
    /// The latest Merkle root, representing the current state of the tree.
    pub merkle_root: [u8; 32],
    /// A list of commitments to track deposits and prevent duplicate entries.
    pub commitments: Vec<[u8; 32]>,
    /// A list of nullifier hashes to track spent commitments and prevent double spending.
    pub nullifiers_hashes: Vec<[u8; 32]>,
    /// The fixed amount per withdrawal, ensuring uniformity in transactions.
    pub amount_per_withdrawal: u64,
    /// A nonce used to uniquely identify different pools.
    pub nonce: u8,
    /// The public key of the vault where funds are stored.
    pub vault: Pubkey,
}

impl Sukura {
    /// Calculates the required space for storing a `Sukura` account.
    ///
    /// ### Breakdown of space calculation:
    /// - `merkle_tree` (MerkleTreeWithHistory)
    ///   - `levels`: 4 bytes
    ///   - `filled_subtrees`: 32 * 32 + 24 (metadata overhead) = 1048 bytes
    ///   - `roots`: 32 * 32 + 24 = 1048 bytes
    ///   - `current_root_index`: 8 bytes
    ///   - `next_index`: 4 bytes
    ///   - **Total for `merkle_tree`** = 2112 bytes
    /// - `merkle_root`: 32 bytes
    /// - `commitments`: 32 * 32 + 24 = 1048 bytes
    /// - `nullifiers_hashes`: 32 * 32 + 24 = 1048 bytes
    /// - `amount_per_withdrawal`: 8 bytes
    /// - `nonce`: 4 bytes (aligned to 4 bytes for Anchor serialization)
    /// - `vault`: 32 bytes (Pubkey size)
    ///
    /// **Total storage space required:**
    /// ```
    /// merkle_tree + merkle_root + commitments + nullifiers + amount_per_withdrawal + nonce + vault
    /// = 2112 + 32 + 1048 + 1048 + 8 + 4 + 32 = 4224 bytes
    /// ```
    /// **Final allocation:** 8 bytes (discriminator) + 4224 bytes = **4232 bytes**
    pub const SPACE: usize = 8 + 4224;
}
