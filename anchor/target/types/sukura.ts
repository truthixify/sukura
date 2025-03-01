/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sukura.json`.
 */
export type Sukura = {
    address: '7g6rj2p3kSAA3oyoAgsZQ8z9aB2YGJZ5t1nu5duwrjev'
    metadata: {
        name: 'sukura'
        version: '0.1.0'
        spec: '0.1.0'
        description: 'Created with Anchor'
    }
    instructions: [
        {
            name: 'deposit'
            docs: ['Deposits a commitment into the Merkle Tree']
            discriminator: [242, 35, 198, 137, 82, 225, 242, 182]
            accounts: [
                {
                    name: 'pool'
                    writable: true
                },
                {
                    name: 'vault'
                    writable: true
                    relations: ['pool']
                },
                {
                    name: 'sender'
                    writable: true
                    signer: true
                },
                {
                    name: 'poolSigner'
                    pda: {
                        seeds: [
                            {
                                kind: 'account'
                                path: 'pool'
                            },
                        ]
                    }
                },
                {
                    name: 'systemProgram'
                    address: '11111111111111111111111111111111'
                },
            ]
            args: [
                {
                    name: 'commitment'
                    type: {
                        array: ['u8', 32]
                    }
                },
            ]
        },
        {
            name: 'initializePool'
            discriminator: [95, 180, 10, 172, 84, 174, 232, 40]
            accounts: [
                {
                    name: 'authority'
                    writable: true
                    signer: true
                },
                {
                    name: 'pool'
                    writable: true
                    signer: true
                },
                {
                    name: 'poolSigner'
                    pda: {
                        seeds: [
                            {
                                kind: 'account'
                                path: 'pool'
                            },
                        ]
                    }
                },
                {
                    name: 'vault'
                    writable: true
                    pda: {
                        seeds: [
                            {
                                kind: 'account'
                                path: 'pool'
                            },
                        ]
                    }
                },
                {
                    name: 'systemProgram'
                    address: '11111111111111111111111111111111'
                },
            ]
            args: [
                {
                    name: 'levels'
                    type: 'u32'
                },
                {
                    name: 'amountPerWithdrawal'
                    type: 'u64'
                },
                {
                    name: 'nonce'
                    type: 'u8'
                },
            ]
        },
        {
            name: 'isSpent'
            discriminator: [222, 240, 83, 255, 100, 140, 41, 39]
            accounts: [
                {
                    name: 'pool'
                    writable: true
                },
                {
                    name: 'vault'
                    writable: true
                    relations: ['pool']
                },
                {
                    name: 'recipient'
                    writable: true
                },
                {
                    name: 'poolSigner'
                    pda: {
                        seeds: [
                            {
                                kind: 'account'
                                path: 'pool'
                            },
                        ]
                    }
                },
                {
                    name: 'systemProgram'
                    address: '11111111111111111111111111111111'
                },
            ]
            args: [
                {
                    name: 'nullifierHash'
                    type: {
                        array: ['u8', 32]
                    }
                },
            ]
            returns: 'bool'
        },
        {
            name: 'withdraw'
            docs: ['Withdraws funds by verifying the proof and nullifying the commitment']
            discriminator: [183, 18, 70, 156, 148, 109, 161, 34]
            accounts: [
                {
                    name: 'pool'
                    writable: true
                },
                {
                    name: 'vault'
                    writable: true
                    relations: ['pool']
                },
                {
                    name: 'recipient'
                    writable: true
                },
                {
                    name: 'poolSigner'
                    pda: {
                        seeds: [
                            {
                                kind: 'account'
                                path: 'pool'
                            },
                        ]
                    }
                },
                {
                    name: 'systemProgram'
                    address: '11111111111111111111111111111111'
                },
            ]
            args: [
                {
                    name: 'nullifierHash'
                    type: {
                        array: ['u8', 32]
                    }
                },
                {
                    name: 'root'
                    type: {
                        array: ['u8', 32]
                    }
                },
                {
                    name: 'proofData'
                    type: 'bytes'
                },
                {
                    name: 'fee'
                    type: 'u64'
                },
            ]
        },
    ]
    accounts: [
        {
            name: 'sukura'
            discriminator: [152, 58, 127, 89, 1, 6, 64, 208]
        },
    ]
    events: [
        {
            name: 'depositEvent'
            discriminator: [120, 248, 61, 83, 31, 142, 107, 144]
        },
        {
            name: 'withdrawEvent'
            discriminator: [22, 9, 133, 26, 160, 44, 71, 192]
        },
    ]
    errors: [
        {
            code: 6000
            name: 'commitmentAlreadyExists'
            msg: 'Commitment already exists in the Merkle Tree'
        },
        {
            code: 6001
            name: 'nullifierAlreadyUsed'
            msg: 'Nullifier has already been used'
        },
        {
            code: 6002
            name: 'rootNotFound'
            msg: 'Root not found in the merkle tree'
        },
        {
            code: 6003
            name: 'invalidProof'
            msg: 'Invalid proof provided for withdrawal'
        },
    ]
    types: [
        {
            name: 'depositEvent'
            type: {
                kind: 'struct'
                fields: [
                    {
                        name: 'commitment'
                        type: {
                            array: ['u8', 32]
                        }
                    },
                    {
                        name: 'leafIndex'
                        type: 'u32'
                    },
                    {
                        name: 'timestamp'
                        type: 'i64'
                    },
                ]
            }
        },
        {
            name: 'merkleTreeWithHistory'
            type: {
                kind: 'struct'
                fields: [
                    {
                        name: 'levels'
                        type: 'u32'
                    },
                    {
                        name: 'filledSubtrees'
                        type: {
                            vec: {
                                array: ['u8', 32]
                            }
                        }
                    },
                    {
                        name: 'roots'
                        type: {
                            vec: {
                                array: ['u8', 32]
                            }
                        }
                    },
                    {
                        name: 'currentRootIndex'
                        type: 'u64'
                    },
                    {
                        name: 'nextIndex'
                        type: 'u32'
                    },
                    {
                        name: 'zeros'
                        type: {
                            vec: {
                                array: ['u8', 32]
                            }
                        }
                    },
                ]
            }
        },
        {
            name: 'sukura'
            type: {
                kind: 'struct'
                fields: [
                    {
                        name: 'merkleTree'
                        type: {
                            defined: {
                                name: 'merkleTreeWithHistory'
                            }
                        }
                    },
                    {
                        name: 'merkleRoot'
                        type: {
                            array: ['u8', 32]
                        }
                    },
                    {
                        name: 'commitments'
                        type: {
                            vec: {
                                array: ['u8', 32]
                            }
                        }
                    },
                    {
                        name: 'nullifiersHashes'
                        type: {
                            vec: {
                                array: ['u8', 32]
                            }
                        }
                    },
                    {
                        name: 'amountPerWithdrawal'
                        type: 'u64'
                    },
                    {
                        name: 'nonce'
                        type: 'u8'
                    },
                    {
                        name: 'vault'
                        type: 'pubkey'
                    },
                ]
            }
        },
        {
            name: 'withdrawEvent'
            type: {
                kind: 'struct'
                fields: [
                    {
                        name: 'recipient'
                        type: 'pubkey'
                    },
                    {
                        name: 'nullifierHash'
                        type: {
                            array: ['u8', 32]
                        }
                    },
                    {
                        name: 'amount'
                        type: 'u64'
                    },
                ]
            }
        },
    ]
}
