'use client'

import { getSukuraProgram, getSukuraProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import {
    Cluster,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import {
    formatError,
    parseSimulationError,
    useErrorToast,
    useTransactionToast,
} from '../ui/ui-layout'
import BN from 'bn.js'
import { bigintToUint8Array, parseProofToBytesArray, parseToBytesArray } from '../../../utils/utils'
import { signTransactionWithRelayer } from '../../utils/relayer'
import { getComputeUnitsIx } from '../../utils/compute-unit'
import { handleAnchorError } from '@/utils/parse-anchor-error'

export function useSukuraProgram() {
    const { connection } = useConnection()
    const { cluster } = useCluster()
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
    const errorToast = useErrorToast()
    const { program, accounts, programId } = useSukuraProgram()

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
            const [vaultAddress, nonce] = PublicKey.findProgramAddressSync(
                [account.toBuffer()],
                programId
            )

            const txIns = await program.methods
                .deposit(commitmentArr)
                .accountsStrict({
                    pool: account,
                    sender: provider.publicKey,
                    vault: vaultAddress,
                    poolSigner: vaultAddress,
                    systemProgram: SystemProgram.programId,
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

            const signatureArr = await provider.sendAll([{ tx }])
            const signature = signatureArr[0]

            try {
                await fetch('/api/merkleTree', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        poolAddress: account.toString(),
                        commitment,
                        signature,
                    }),
                })
            } catch (err) {
                console.log(err)
                throw err
            }

            return signature
        },
        onSuccess: (tx) => {
            transactionToast(tx)
            return accounts.refetch()
        },
        onError: (err) => {
            errorToast(
                'Failed to deposit',
                parseSimulationError(err.logs).reason
                    ? parseSimulationError(err.logs).reason
                    : formatError(err)
            )
        },
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
            vaultAddress,
        }: {
            nullifierHash: string
            root: string
            proof: any
            publicSignals: any
            fee: BN
            recipientAddress: PublicKey
            relayerWallet: PublicKey
            vaultAddress: PublicKey
        }) => {
            const proofArray = parseProofToBytesArray(proof)
            const publicSignalsArray = parseToBytesArray(publicSignals)
            const proofInstruction = Buffer.from([...proofArray, ...publicSignalsArray.flat()])
            const nullifierHashArr = [...bigintToUint8Array(BigInt(nullifierHash))]
            const rootArr = [...bigintToUint8Array(BigInt(root))]

            const instruction = await program.methods
                .withdraw(nullifierHashArr, rootArr, proofInstruction, fee)
                .accountsStrict({
                    recipient: recipientAddress,
                    pool: account,
                    vault: vaultAddress,
                    poolSigner: vaultAddress,
                    relayer: relayerWallet,
                    systemProgram: SystemProgram.programId,
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

            let signature
            try {
                signature = await signTransactionWithRelayer(serializedMessage)
            } catch (err) {
                const errorMessage = handleAnchorError(err)
                throw new Error(errorMessage)
            }

            return signature as string
        },
        onSuccess: (tx) => {
            transactionToast(tx)
            return accountQuery.refetch()
        },
        onError: (err) => errorToast('Failed to withdraw', formatError(err)),
    })

    return {
        accountQuery,
        depositMutation,
        withdrawMutation,
    }
}
