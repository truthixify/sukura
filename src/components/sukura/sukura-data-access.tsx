'use client'

import { getSukuraProgram, getSukuraProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import {
    Cluster,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import BN from 'bn.js'
import {
    generateDeposit,
    bigintToUint8Array,
    generateWitnessAndProve,
    parseProofToBytesArray,
    parseToBytesArray,
    solanaAddressToBigInt,
    NoteData,
    createPoseidonHash,
} from '../../../utils/utils'
import MerkleTree from 'fixed-merkle-tree'
import { getOrCreateRelayerWallet, signTransactinWithRelayer } from '../../../utils/relayer'
import { getComputeUnitsIx } from '../../utils/computeUnit'
import { IMerkleTree } from '@/app/api/merkleTree/model'
import { confirmTransaction } from '@/utils/txConfirmationRetry'

const levels = 28
const amountPerWithdrawal = new BN(1_000_000)
const fee = BigInt(amountPerWithdrawal.toNumber() * 0.01).toString()

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

    return {
        program,
        programId,
        accounts,
        getProgramAccount,
    }
}

export function useSukuraProgramAccount({ account }: { account: PublicKey }) {
    const { cluster } = useCluster()
    const transactionToast = useTransactionToast()
    const { program, accounts } = useSukuraProgram()

    const accountQuery = useQuery({
        queryKey: ['sukura', 'fetch', { cluster, account }],
        queryFn: () => program.account.sukura.fetch(account),
    })
    const provider = useAnchorProvider()
    const { connection } = useConnection()

    const depositMutation = useMutation({
        mutationKey: ['sukura', 'deposit', { cluster, account }],
        mutationFn: async (commitment: string) => {
            const commitmentArr = Array.from(bigintToUint8Array(BigInt(commitment)))

            const txIns = await program.methods
                .deposit(commitmentArr)
                .accounts({
                    pool: account,
                    sender: provider.publicKey,
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
            let signature
            try {
                const signatureArr = await provider.sendAll([{ tx }])
                signature = signatureArr[0]
            } catch (err) {
                throw new Error('Transaction submission failed')
            }

            await confirmTransaction(connection, signature)

            await fetch('/api/merkleTree', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    poolAddress: account.toString(),
                    element: commitment,
                }),
            })

            return signature
        },
        onSuccess: (tx) => {
            transactionToast(tx)
            return accounts.refetch()
        },
        onError: (err) => toast.error(`Failed to deposit: ${err}`),
    })

    const withdrawMutation = useMutation({
        mutationKey: ['sukura', 'withdraw', { cluster, account }],
        mutationFn: async ({
            nullifierHash,
            root,
            proof,
            publicSignals,
            fee,
            recipientAddress,
            relayerWallet,
        }: {
            nullifierHash: string
            root: string
            proof: any
            publicSignals: any
            fee: BN
            recipientAddress: PublicKey
            relayerWallet: PublicKey
        }) => {
            const proofArray = parseProofToBytesArray(proof)
            const publicSignalsArray = parseToBytesArray(publicSignals)
            const proofInstruction = Buffer.from([...proofArray, ...publicSignalsArray.flat()])
            const nullifierHashArr = [...bigintToUint8Array(BigInt(nullifierHash))]
            const rootArr = [...bigintToUint8Array(BigInt(root))]

            const instruction = await program.methods
                .withdraw(nullifierHashArr, rootArr, proofInstruction, fee)
                .accounts({
                    recipient: recipientAddress,
                    pool: account,
                })
                .instruction()
            const { blockhash } = await connection.getLatestBlockhash()
            const messageV0 = new TransactionMessage({
                payerKey: relayerWallet,
                recentBlockhash: blockhash,
                instructions: [instruction],
            }).compileToV0Message()
            const transaction = new VersionedTransaction(messageV0)
            const serializedMessage = Buffer.from(transaction.serialize()).toString('base64')

            const signature = await signTransactinWithRelayer(serializedMessage)

            return signature as string
        },
        onSuccess: (tx) => {
            transactionToast(tx)
            return accountQuery.refetch()
        },
        onError: (err) => toast.error(`Failed to withdraw: ${err}`),
    })

    return {
        accountQuery,
        depositMutation,
        withdrawMutation,
    }
}
