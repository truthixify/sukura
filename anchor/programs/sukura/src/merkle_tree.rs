use anchor_lang::prelude::*;
use anchor_lang::solana_program::poseidon::{hashv, Endianness, Parameters};
use num_bigint::BigUint;
use num_traits::Num;
// use hex::FromHex;

const FIELD_SIZE: &str =
    "21888242871839275222246405745257275088548364400416034343698204186575808495617";

const ROOT_HISTORY_SIZE: usize = 30;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Debug)]
pub struct MerkleTreeWithHistory {
    levels: u32,
    filled_subtrees: Vec<[u8; 32]>,
    roots: Vec<[u8; 32]>,
    current_root_index: u64,
    next_index: u32,
    zeros: Vec<[u8; 32]>,
}

impl MerkleTreeWithHistory {
    pub fn build_zeros(levels: u32) -> Vec<[u8; 32]> {
        let mut zeros = vec![[0u8; 32]];

        for i in 1..=levels {
            zeros.push(Self::hash(zeros[(i - 1) as usize], zeros[(i - 1) as usize]));
        }

        zeros
    }

    pub fn new(levels: u32) -> Self {
        assert!(levels > 0 && levels < 32, "Invalid tree depth");
        let mut filled_subtrees = vec![[0u8; 32]; levels as usize];

        let zeros = Self::build_zeros(levels);
        for i in 0..levels as usize {
            filled_subtrees[i] = zeros[levels as usize];
        }
        println!("filled: {:?}", filled_subtrees);

        let mut roots = Vec::with_capacity(ROOT_HISTORY_SIZE);
        roots.push(zeros[levels as usize]);

        Self {
            levels,
            filled_subtrees,
            roots,
            current_root_index: 0,
            next_index: 0,
            zeros,
        }
    }

    pub fn hash(left: [u8; 32], right: [u8; 32]) -> [u8; 32] {
        let field_size = BigUint::from_str_radix(FIELD_SIZE, 10).unwrap();
        let left_biguint = BigUint::from_bytes_be(&left);
        let right_biguint = BigUint::from_bytes_be(&right);

        assert!(left_biguint < field_size, "left should be inside the field");
        assert!(
            right_biguint < field_size,
            "right should be inside the field"
        );

        hashv(Parameters::Bn254X5, Endianness::BigEndian, &[&left, &right])
            .unwrap()
            .to_bytes()
    }

    pub fn insert(&mut self, leaf: [u8; 32]) -> u32 {
        assert!(
            self.next_index < (1u32 << self.levels),
            "Merkle tree is full"
        );

        let mut current_index = self.next_index;
        let mut current_level_hash = leaf;

        for i in 0..self.levels {
            let zero_hash = self.zeros[i as usize];
            if current_index % 2 == 0 {
                self.filled_subtrees[i as usize] = current_level_hash;
                current_level_hash = Self::hash(current_level_hash, zero_hash);
            } else {
                current_level_hash =
                    Self::hash(self.filled_subtrees[i as usize], current_level_hash);
            }
            current_index /= 2;
        }

        if self.roots.len() >= ROOT_HISTORY_SIZE {
            self.roots.remove(0);
        }
        self.roots.push(current_level_hash);
        self.current_root_index = (self.roots.len() - 1) as u64;
        self.next_index += 1;
        self.next_index - 1
    }

    pub fn is_known_root(&self, root: [u8; 32]) -> bool {
        self.roots.contains(&root)
    }

    pub fn get_last_root(&self) -> [u8; 32] {
        self.roots[self.current_root_index as usize]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper function to create a Merkle tree with some leaves
    fn setup_tree() -> MerkleTreeWithHistory {
        let mut tree = MerkleTreeWithHistory::new(4);
        tree.insert([1u8; 32]);
        tree.insert([2u8; 32]);
        tree.insert([3u8; 32]);
        tree.insert([4u8; 32]);

        tree
    }

    #[test]
    fn test_merkle_tree_construction() {
        let tree = setup_tree();

        assert_eq!(tree.levels, 4, "Merkle tree height should be correct");

        let expected_root = tree.get_last_root();
        let mut tree2 = MerkleTreeWithHistory::new(tree.levels);
        for i in 1..=4 {
            tree2.insert([i as u8; 32]);
        }
        assert_eq!(
            tree2.get_last_root(),
            expected_root,
            "Merkle roots should match"
        );
    }

    #[test]
    fn test_root_changes_on_leaf_update() {
        let mut tree = setup_tree();
        let old_root = tree.get_last_root();

        tree.insert([1u8; 32]);

        assert_ne!(
            tree.get_last_root(),
            old_root,
            "Root should change after updating a leaf"
        );
        assert!(tree.is_known_root(old_root), "Old root should be known");
    }

    #[test]
    fn test_empty_tree() {
        let tree = MerkleTreeWithHistory::new(1);

        assert_eq!(tree.levels, 1, "Empty tree should have height 0");
        assert_eq!(
            tree.get_last_root(),
            [
                32, 152, 245, 251, 158, 35, 158, 171, 60, 234, 195, 242, 123, 129, 228, 129, 220,
                49, 36, 213, 95, 254, 213, 35, 168, 57, 238, 132, 70, 182, 72, 100
            ],
            "Empty tree root should be zero"
        );
        assert!(
            tree.is_known_root([
                32, 152, 245, 251, 158, 35, 158, 171, 60, 234, 195, 242, 123, 129, 228, 129, 220,
                49, 36, 213, 95, 254, 213, 35, 168, 57, 238, 132, 70, 182, 72, 100
            ]),
            "Empty tree should have known root"
        );
    }
}
