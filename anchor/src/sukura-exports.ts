// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import SukuraIDL from '../target/idl/sukura.json'
import type { Sukura } from '../target/types/sukura'

// Re-export the generated IDL and type
export { Sukura, SukuraIDL }

// The programId is imported from the program IDL.
export const SUKURA_PROGRAM_ID = new PublicKey(SukuraIDL.address)

// This is a helper function to get the Sukura Anchor program.
export function getSukuraProgram(provider: AnchorProvider, address?: PublicKey) {
    return new Program(
        { ...SukuraIDL, address: address ? address.toBase58() : SukuraIDL.address } as Sukura,
        provider
    )
}

// This is a helper function to get the program ID for the Sukura program depending on the cluster.
export function getSukuraProgramId(cluster: Cluster) {
    switch (cluster) {
        case 'devnet':
            return SUKURA_PROGRAM_ID
        case 'testnet':
            // This is the program ID for the Sukura program on devnet and testnet.
            return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
        case 'mainnet-beta':
        default:
            return SUKURA_PROGRAM_ID
    }
}
