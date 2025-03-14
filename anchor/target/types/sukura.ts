/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sukura.json`.
 */
export type Sukura = {
  "address": "BAeMcGDnkVc53FFhAjPePpJRABsGS8NAehqqsYNztXJF",
  "metadata": {
    "name": "sukura",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "deposit",
      "docs": [
        "Deposits a new commitment into the Merkle Tree.",
        "",
        "# Arguments",
        "* `ctx` - The transaction context.",
        "* `commitment` - A 32-byte commitment to be stored in the tree."
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "pool",
          "docs": [
            "The pool account that manages deposits and withdrawals."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "docs": [
            "The vault account that stores deposited funds."
          ],
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "sender",
          "docs": [
            "The sender account that initiates the deposit transaction."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "poolSigner",
          "docs": [
            "The pool signer account, which authorizes transactions."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program required for fund transfers."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initializePool",
      "docs": [
        "Initializes a new pool with a given Merkle Tree depth, fixed withdrawal amount, and a nonce for pool identification.",
        "",
        "# Arguments",
        "* `ctx` - The context containing relevant accounts.",
        "* `levels` - Depth of the Merkle Tree.",
        "* `amount_per_withdrawal` - The fixed withdrawal amount per transaction.",
        "* `nonce` - A unique identifier for the pool."
      ],
      "discriminator": [
        95,
        180,
        10,
        172,
        84,
        174,
        232,
        40
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The account authorized to create the pool.",
            "",
            "This must match the predefined `HARDCODED_PUBKEY` to ensure only",
            "the designated entity can initialize the pool."
          ],
          "writable": true,
          "signer": true,
          "address": "3pzgiv8AQotxN6UVCVv9zVQ2qsf4Dx3LZY6ixZGau9M7"
        },
        {
          "name": "pool",
          "docs": [
            "The account storing the Sukura pool state.",
            "",
            "This account is initialized and paid for by the authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "poolSigner",
          "docs": [
            "The pool signer account derived from the pool’s public key and nonce.",
            "",
            "This account serves as the authority for executing transactions within the pool."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The vault account where deposited funds are stored.",
            "",
            "This account is derived from the pool's public key and nonce."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "The Solana system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "levels",
          "type": "u32"
        },
        {
          "name": "amountPerWithdrawal",
          "type": "u64"
        },
        {
          "name": "nonce",
          "type": "u8"
        }
      ]
    },
    {
      "name": "isSpent",
      "docs": [
        "Checks whether a given nullifier hash has already been spent.",
        "",
        "# Arguments",
        "* `ctx` - The transaction context.",
        "* `nullifier_hash` - A 32-byte hash representing a previously used commitment.",
        "",
        "# Returns",
        "* `Ok(true)` if the nullifier has been spent, otherwise `Ok(false)`."
      ],
      "discriminator": [
        222,
        240,
        83,
        255,
        100,
        140,
        41,
        39
      ],
      "accounts": [
        {
          "name": "pool",
          "docs": [
            "The pool account managing the Merkle tree and funds."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "poolSigner",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "relayer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program required for executing transfers."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nullifierHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ],
      "returns": "bool"
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraws funds by verifying a zero-knowledge proof and nullifying the spent commitment.",
        "",
        "# Arguments",
        "* `ctx` - The transaction context.",
        "* `nullifier_hash` - A 32-byte nullifier hash used to track spent commitments.",
        "* `root` - The Merkle Root at the time of withdrawal.",
        "* `proof_data` - A serialized zero-knowledge proof verifying the legitimacy of the withdrawal.",
        "* `fee` - The transaction fee deducted from the withdrawal."
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "pool",
          "docs": [
            "The pool account managing the Merkle tree and funds."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "poolSigner",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "relayer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program required for executing transfers."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nullifierHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "root",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "proofData",
          "type": "bytes"
        },
        {
          "name": "fee",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "sukura",
      "discriminator": [
        152,
        58,
        127,
        89,
        1,
        6,
        64,
        208
      ]
    }
  ],
  "events": [
    {
      "name": "depositEvent",
      "discriminator": [
        120,
        248,
        61,
        83,
        31,
        142,
        107,
        144
      ]
    },
    {
      "name": "withdrawEvent",
      "discriminator": [
        22,
        9,
        133,
        26,
        160,
        44,
        71,
        192
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "commitmentAlreadyExists",
      "msg": "Commitment already exists in the merkle tree"
    },
    {
      "code": 6001,
      "name": "nullifierAlreadyUsed",
      "msg": "Nullifier has already been used"
    },
    {
      "code": 6002,
      "name": "rootNotFound",
      "msg": "Root not found in the merkle tree"
    },
    {
      "code": 6003,
      "name": "invalidProof",
      "msg": "Invalid proof provided for withdrawal"
    }
  ],
  "types": [
    {
      "name": "depositEvent",
      "docs": [
        "Event emitted when a deposit is successfully made into the pool.",
        "",
        "This event helps track deposits on-chain, allowing external applications",
        "to monitor changes in the Merkle Tree state.",
        "",
        "Fields:",
        "- `commitment`: The commitment (hashed secret) of the deposit.",
        "- `leaf_index`: The index at which the commitment was inserted in the Merkle Tree.",
        "- `timestamp`: The Unix timestamp at which the deposit was made."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitment",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u32"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "merkleTreeWithHistory",
      "docs": [
        "A struct representing a Merkle Tree with history for storing commitments."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "levels",
            "docs": [
              "The depth of the Merkle tree (number of levels)."
            ],
            "type": "u32"
          },
          {
            "name": "filledSubtrees",
            "docs": [
              "Stores intermediate hashes of subtree roots at each level."
            ],
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "roots",
            "docs": [
              "Stores the historical Merkle roots."
            ],
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "currentRootIndex",
            "docs": [
              "Tracks the index of the current Merkle root."
            ],
            "type": "u64"
          },
          {
            "name": "nextIndex",
            "docs": [
              "Tracks the next available index for inserting a new leaf."
            ],
            "type": "u32"
          },
          {
            "name": "zeros",
            "docs": [
              "Precomputed zero hashes for empty nodes at each level."
            ],
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "sukura",
      "docs": [
        "The `Sukura` account struct represents a shielded pool for private transactions.",
        "It maintains a Merkle tree for commitments, nullifier hashes to prevent double spending,",
        "and various other fields related to withdrawals and fund storage."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merkleTree",
            "docs": [
              "The Merkle tree used to store commitments as leaves."
            ],
            "type": {
              "defined": {
                "name": "merkleTreeWithHistory"
              }
            }
          },
          {
            "name": "merkleRoot",
            "docs": [
              "The latest Merkle root, representing the current state of the tree."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "commitments",
            "docs": [
              "A list of commitments to track deposits and prevent duplicate entries."
            ],
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "nullifiersHashes",
            "docs": [
              "A list of nullifier hashes to track spent commitments and prevent double spending."
            ],
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "amountPerWithdrawal",
            "docs": [
              "The fixed amount per withdrawal, ensuring uniformity in transactions."
            ],
            "type": "u64"
          },
          {
            "name": "nonce",
            "docs": [
              "A nonce used to uniquely identify different pools."
            ],
            "type": "u8"
          },
          {
            "name": "vault",
            "docs": [
              "The public key of the vault where funds are stored."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "withdrawEvent",
      "docs": [
        "Event emitted when a withdrawal is successfully executed.",
        "",
        "This event ensures that each withdrawal is publicly logged and can be",
        "used to track transactions while maintaining user privacy.",
        "",
        "Fields:",
        "- `recipient`: The public key of the account receiving the withdrawn funds.",
        "- `nullifier_hash`: The nullifier hash used to prevent double spending.",
        "- `amount`: The amount withdrawn after deducting any applicable fees."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "nullifierHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
