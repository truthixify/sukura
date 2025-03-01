'use client'

import { getSukuraProgram, getSukuraProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import {
    Cluster,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from 'bn.js'
import { getComputeUnitsIx } from '../../utils/computeUnit'

const levels = 28

export function useSukuraProgram() {
    const { connection } = useConnection()
    const { cluster } = useCluster()
    const transactionToast = useTransactionToast()
    const provider = useAnchorProvider()
    const programId = useMemo(() => getSukuraProgramId(cluster.network as Cluster), [cluster])
    const program = useMemo(() => getSukuraProgram(provider, programId), [provider, programId])

    const accounts = useQuery({
        queryKey: ['sukura', 'all', { cluster }],
        queryFn: () => program.account.sukura.all(),
    })

    const getProgramAccount = useQuery({
        queryKey: ['get-program-account', { cluster }],
        queryFn: () => connection.getParsedAccountInfo(programId),
    })

    const initializePool = useMutation({
        mutationKey: ['sukura', 'initialize', { cluster }],
        mutationFn: async (amount: number | null) => {
            let pool = Keypair.generate()
            const [vault, nonce] = PublicKey.findProgramAddressSync(
                [pool.publicKey.toBuffer()],
                programId
            )

            if (!amount) {
                throw new Error('Amount cannot be null')
            }

            const amountPerWithdrawal = new BN(amount * LAMPORTS_PER_SOL)

            const txIns = await program.methods
                .initializePool(levels, amountPerWithdrawal, nonce)
                .accounts({
                    pool: pool.publicKey,
                    authority: provider.publicKey,
                })
                .instruction()
            const { blockhash } = await connection.getLatestBlockhash()
            const computeUnitsIx = await getComputeUnitsIx(
                connection,
                [txIns],
                provider.wallet.publicKey
            )
            const messageV0 = new TransactionMessage({
                payerKey: provider.wallet.publicKey,
                recentBlockhash: blockhash,
                instructions: [computeUnitsIx, txIns],
            }).compileToV0Message()
            const tx = new VersionedTransaction(messageV0)
            tx.sign([pool])
            const signature = await provider.sendAndConfirm(tx)

            await fetch('/api/merkleTree', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    poolAddress: pool.publicKey.toString(),
                    levels: 28,
                    amountPerWithdrawal: amountPerWithdrawal.toNumber(),
                    vaultAddress: vault.toString(),
                }),
            })

            return signature
        },
        onSuccess: (signature) => {
            transactionToast(signature)
            return accounts.refetch()
        },
        onError: () => toast.error('Failed to initialize account'),
    })

    return {
        program,
        programId,
        accounts,
        getProgramAccount,
        initializePool,
    }
}

export function useSukuraProgramAccount({ account }: { account: PublicKey }) {
    const { cluster } = useCluster()
    const { program } = useSukuraProgram()

    const accountQuery = useQuery({
        queryKey: ['sukura', 'fetch', { cluster, account }],
        queryFn: () => program.account.sukura.fetch(account),
    })

    return {
        accountQuery,
    }
}
