use anchor_lang::prelude::*;
use anchor_lang::solana_program::poseidon::{hashv, Endianness, Parameters};
use hex::FromHex;
use num_bigint::BigUint;
use num_traits::Num;

const FIELD_SIZE: &str =
    "21888242871839275222246405745257275088548364400416034343698204186575808495617";
const ZERO_VALUE: &str =
    "21663839004416932945382355908790599225266501822907911457504978515578255421292";
const ROOT_HISTORY_SIZE: usize = 30;

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct MerkleTreeWithHistory {
    levels: u32,
    filled_subtrees: Vec<[u8; 32]>,
    roots: Vec<[u8; 32]>,
    current_root_index: u64,
    next_index: u32,
}

impl MerkleTreeWithHistory {
    pub fn new(levels: u32) -> Self {
        assert!(levels > 0 && levels < 32, "Invalid tree depth");
        let mut zero_value: [u8; 32] = [0u8; 32];
        hex::decode_to_slice(ZERO_VALUE, &mut zero_value).unwrap();
        let mut filled_subtrees = vec![zero_value; levels as usize];

        for i in 0..levels as usize {
            filled_subtrees[i] = zeros(i as u32);
        }

        let mut roots = Vec::with_capacity(ROOT_HISTORY_SIZE);
        roots.push(zeros(levels - 1));

        Self {
            levels,
            filled_subtrees,
            roots,
            current_root_index: 0,
            next_index: 0,
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
            let zero_hash = zeros(i); // Use precomputed zero values
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

// #[derive(AnchorDeserialize, AnchorSerialize, Clone)]
// pub struct MerkleRoot([u8; 32]);

// #[derive(AnchorDeserialize, AnchorSerialize, Clone)]
// pub struct Commitments(Vec<[u8; 32]>);

// #[derive(AnchorDeserialize, AnchorSerialize, Clone)]
// pub struct NullifierHashes(Vec<[u8; 32]>);

pub fn zeros(i: u32) -> [u8; 32] {
    let hex_str = match i {
        0 => "2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c",
        1 => "256a6135777eee2fd26f54b8b7037a25439d5235caee224154186d2b8a52e31d",
        2 => "1151949895e82ab19924de92c40a3d6f7bcb60d92b00504b8199613683f0c200",
        3 => "20121ee811489ff8d61f09fb89e313f14959a0f28bb428a20dba6b0b068b3bdb",
        4 => "0a89ca6ffa14cc462cfedb842c30ed221a50a3d6bf022a6a57dc82ab24c157c9",
        5 => "24ca05c2b5cd42e890d6be94c68d0689f4f21c9cec9c0f13fe41d566dfb54959",
        6 => "1ccb97c932565a92c60156bdba2d08f3bf1377464e025cee765679e604a7315c",
        7 => "19156fbd7d1a8bf5cba8909367de1b624534ebab4f0f79e003bccdd1b182bdb4",
        8 => "261af8c1f0912e465744641409f622d466c3920ac6e5ff37e36604cb11dfff80",
        9 => "0058459724ff6ca5a1652fcbc3e82b93895cf08e975b19beab3f54c217d1c007",
        10 => "1f04ef20dee48d39984d8eabe768a70eafa6310ad20849d4573c3c40c2ad1e30",
        11 => "1bea3dec5dab51567ce7e200a30f7ba6d4276aeaa53e2686f962a46c66d511e5",
        12 => "0ee0f941e2da4b9e31c3ca97a40d8fa9ce68d97c084177071b3cb46cd3372f0f",
        13 => "1ca9503e8935884501bbaf20be14eb4c46b89772c97b96e3b2ebf3a36a948bbd",
        14 => "133a80e30697cd55d8f7d4b0965b7be24057ba5dc3da898ee2187232446cb108",
        15 => "13e6d8fc88839ed76e182c2a779af5b2c0da9dd18c90427a644f7e148a6253b6",
        16 => "1eb16b057a477f4bc8f572ea6bee39561098f78f15bfb3699dcbb7bd8db61854",
        17 => "0da2cb16a1ceaabf1c16b838f7a9e3f2a3a3088d9e0a6debaa748114620696ea",
        18 => "24a3b3d822420b14b5d8cb6c28a574f01e98ea9e940551d2ebd75cee12649f9d",
        19 => "198622acbd783d1b0d9064105b1fc8e4d8889de95c4c519b3f635809fe6afc05",
        20 => "29d7ed391256ccc3ea596c86e933b89ff339d25ea8ddced975ae2fe30b5296d4",
        21 => "19be59f2f0413ce78c0c3703a3a5451b1d7f39629fa33abd11548a76065b2967",
        22 => "1ff3f61797e538b70e619310d33f2a063e7eb59104e112e95738da1254dc3453",
        23 => "10c16ae9959cf8358980d9dd9616e48228737310a10e2b6b731c1a548f036c48",
        24 => "0ba433a63174a90ac20992e75e3095496812b652685b5e1a2eae0b1bf4e8fcd1",
        25 => "019ddb9df2bc98d987d0dfeca9d2b643deafab8f7036562e627c3667266a044c",
        26 => "2d3c88b23175c5a5565db928414c66d1912b11acf974b2e644caaac04739ce99",
        27 => "2eab55f6ae4e66e32c5189eed5c470840863445760f5ed7e7b69b2a62600f354",
        28 => "002df37a2642621802383cf952bf4dd1f32e05433beeb1fd41031fb7eace979d",
        29 => "104aeb41435db66c3e62feccc1d6f5d98d0a0ed75d1374db457cf462e3a1f427",
        30 => "1f3c6fd858e9a7d4b0d1f38e256a09d81d5a5e3c963987e2d4b814cfab7c6ebb",
        31 => "2c7a07d20dff79d01fecedc1134284a8d08436606c93693b67e333f671bf69cc",
        _ => panic!("Index out of bounds"),
    };

    <[u8; 32]>::from_hex(hex_str).expect("Invalid hex string")
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

        tree.insert([
            0x25, 0x6a, 0x61, 0x35, 0x77, 0x7e, 0xee, 0x2f, 0xd2, 0x6f, 0x54, 0xb8, 0xb7, 0x03,
            0x7a, 0x25, 0x43, 0x9d, 0x52, 0x35, 0xca, 0xee, 0x22, 0x41, 0x54, 0x18, 0x6d, 0x2b,
            0x8a, 0x52, 0xe3, 0x1d,
        ]);

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
            zeros(0),
            "Empty tree root should be zero"
        );
        assert!(
            tree.is_known_root(zeros(0)),
            "Empty tree should have known root"
        );
    }
}
