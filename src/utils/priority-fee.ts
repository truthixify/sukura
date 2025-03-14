import { ComputeBudgetProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

/**
 * The priority rate for compute unit pricing, measured in micro-lamports.
 * This determines the fee rate for prioritizing transactions.
 */
const PRIORITY_RATE = 100 // MICRO_LAMPORTS

/**
 * The amount of SOL to send in a transaction.
 * 0.01 SOL is converted to lamports using LAMPORTS_PER_SOL (1 SOL = 1,000,000,000 lamports).
 */
const SEND_AMT = 0.01 * LAMPORTS_PER_SOL

/**
 * Instruction to set the compute unit price for priority fees.
 * This helps ensure transactions are prioritized by validators.
 */
const PRIORITY_FEE_IX = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_RATE })

/**
 * Represents the request payload format for fetching priority fee estimates from an RPC provider.
 */
interface RequestPayload {
    method: string // The JSON-RPC method name
    params: {
        last_n_blocks: number // Number of recent blocks to consider for estimating priority fees
        account: string // The program account to use for local fee estimation
        api_version: number // API version for fetching the fee estimates
    }
    id: number // Unique identifier for the request
    jsonrpc: string // JSON-RPC version (typically "2.0")
}

/**
 * Structure for priority fee estimates per compute unit and per transaction.
 */
interface FeeEstimates {
    extreme: number // The highest priority fee estimate
    high: number // High-priority fee estimate
    low: number // Low-priority fee estimate
    medium: number // Medium-priority fee estimate
    percentiles: {
        [key: string]: number // Fee estimates based on different percentiles
    }
}

/**
 * Defines the structure of response data returned by an RPC provider when estimating priority fees.
 */
interface ResponseData {
    jsonrpc: string // JSON-RPC version
    result: {
        context: {
            slot: number // The current Solana blockchain slot when the request was processed
        }
        per_compute_unit: FeeEstimates // Fee estimates per compute unit
        per_transaction: FeeEstimates // Fee estimates per transaction
    }
    id: number // Unique identifier matching the request
}

/**
 * Parameters for estimating priority fees on Solana.
 */
interface EstimatePriorityFeesParams {
    last_n_blocks?: number // The number of blocks to consider for fee estimation (optional)
    account?: string // The program account for fetching local fee estimates (optional)
    api_version?: number // The API version for the estimation request (optional)
    endpoint: string // The QuickNode or RPC provider endpoint for fetching fee estimates
}
