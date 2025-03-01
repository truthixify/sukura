'use client'

import { getSukuraProgram, getSukuraProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import {
    Cluster,
    Keypair,
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
import { BN } from 'bn.js'
import {
    generateDeposit,
    bigintToUint8Array,
    generateWitnessAndProve,
    parseProofToBytesArray,
    parseToBytesArray,
    solanaAddressToBigInt,
    uint8ArrayToBigInt,
    handleNoteDownload,
    handleNoteUpload,
    NoteData,
    createPoseidonHash,
} from '../../../utils/utils'
import MerkleTree from 'fixed-merkle-tree'
import { getOrCreateRelayerWallet, signTransactinWithRelayer } from '../../../utils/relayer'
import { getComputeUnitsIx } from '../../utils/computeUnit'
import { IMerkleTree } from '@/app/api/merkleTree/model'

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

    const initialize = useMutation({
        mutationKey: ['sukura', 'initialize', { cluster }],
        mutationFn: async () => {
            let pool = Keypair.generate()
            const [vault, nonce] = PublicKey.findProgramAddressSync(
                [pool.publicKey.toBuffer()],
                programId
            )

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
        initialize,
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
        mutationFn: async () => {
            let deposit = await generateDeposit()
            const commitment = Array.from(bigintToUint8Array(BigInt(deposit.commitment.toString())))
            const nullifier = deposit.nullifier.toString()
            const secret = deposit.secret.toString()
            const nullifierHash = deposit.nullifierHash.toString()

            const txIns = await program.methods
                .deposit(commitment)
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
            const signature = await provider.sendAndConfirm(tx)

            const response = await fetch('/api/merkleTree', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    poolAddress: account.toString(),
                    element: deposit.commitment.toString(),
                }),
            })
            const { index } = await response.json()

            handleNoteDownload(index, secret, nullifier, nullifierHash)

            return signature
        },
        onSuccess: (tx) => {
            transactionToast(tx)
            return accounts.refetch()
        },
        onError: (err) => toast.error(`Error depositing: ${err}`),
    })

    const withdrawMutation = useMutation({
        mutationKey: ['sukura', 'withdraw', { cluster, account }],
        mutationFn: async ({
            noteData,
            recipientAddress,
        }: {
            noteData: NoteData
            recipientAddress: PublicKey
        }) => {
            const response = await fetch(`/api/merkleTree/${account.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            const treeData: IMerkleTree = (await response.json()).treeData
            const { tree, vaultAddress, amountPerWithdrawal } = treeData
            const poseidonHash = await createPoseidonHash()
            const deTree = MerkleTree.deserialize(tree, poseidonHash)
            const { index, secret, nullifier, nullifierHash } = noteData
            const relayerWallet = (await getOrCreateRelayerWallet()) as string
            const fee = new BN(amountPerWithdrawal * 0.01)
            const { pathElements, pathIndices } = deTree.path(index)
            const input = {
                root: deTree.root,
                nullifierHash: nullifierHash,
                nullifier: nullifier,
                recipient: solanaAddressToBigInt(recipientAddress.toString()),
                secret,
                pathElements,
                pathIndices,
                relayer: solanaAddressToBigInt(relayerWallet),
                fee: fee.toString(),
            }

            const { proof, publicSignals } = await generateWitnessAndProve(input)
            const proofArray = parseProofToBytesArray(proof)
            const publicSignalsArray = parseToBytesArray(publicSignals)

            const proofInstruction = Buffer.from([...proofArray, ...publicSignalsArray.flat()])
            const nullifierHashArr = [...bigintToUint8Array(BigInt(nullifierHash))]
            const rootArr = [...bigintToUint8Array(BigInt(input.root))]

            const instruction = await program.methods
                .withdraw(nullifierHashArr, rootArr, proofInstruction, fee)
                .accountsStrict({
                    recipient: recipientAddress,
                    pool: account,
                    systemProgram: SystemProgram.programId,
                    vault: new PublicKey(vaultAddress),
                    poolSigner: new PublicKey(vaultAddress),
                })
                .instruction()
            const { blockhash } = await connection.getLatestBlockhash()
            const messageV0 = new TransactionMessage({
                payerKey: new PublicKey(relayerWallet),
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
        onError: (err) => toast.error(`Error withdrawing: ${err}`),
    })

    return {
        accountQuery,
        depositMutation,
        withdrawMutation,
    }
}
