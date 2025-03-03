import { ComputeBudgetProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

const PRIORITY_RATE = 100 // MICRO_LAMPORTS
const SEND_AMT = 0.01 * LAMPORTS_PER_SOL
const PRIORITY_FEE_IX = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_RATE })

interface RequestPayload {
    method: string
    params: {
        last_n_blocks: number
        account: string
        api_version: number
    }
    id: number
    jsonrpc: string
}

interface FeeEstimates {
    extreme: number
    high: number
    low: number
    medium: number
    percentiles: {
        [key: string]: number
    }
}

interface ResponseData {
    jsonrpc: string
    result: {
        context: {
            slot: number
        }
        per_compute_unit: FeeEstimates
        per_transaction: FeeEstimates
    }
    id: number
}

interface EstimatePriorityFeesParams {
    // The number of blocks to consider for the fee estimate
    last_n_blocks?: number
    // The program account to use for fetching the local estimate (e.g., Jupiter: JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4)
    account?: string
    // The API version to use for fetching the local estimate
    api_version?: number
    // Your Add-on Endpoint (found in your QuickNode Dashboard - https://dashboard.quicknode.com/endpoints)
    endpoint: string
}
