use crate::merkle_tree::MerkleTreeWithHistory;
use anchor_lang::prelude::*;

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
