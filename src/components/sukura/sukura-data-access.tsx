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
} from '../../../utils/utils'
import MerkleTree from 'fixed-merkle-tree'
import { buildPoseidon } from 'circomlibjs'
import { getOrCreateRelayerWallet, signTransactinWithRelayer } from '../../../utils/relayer'
import { getComputeUnitsIx } from '../../utils/computeUnit'

const levels = 28
const amountPerWithdrawal = new BN(1_000_000)
const fee = BigInt(amountPerWithdrawal.toNumber() * 0.01)
const createPoseidonHash = async () => {
    const poseidon = await buildPoseidon()
    return (a: any, b: any) => poseidon.F.toString(poseidon([a, b]))
}
let tree: any
createPoseidonHash()
    .then((res) => {
        tree = new MerkleTree(levels, [], { hashFunction: res })
    })
    .catch((err) => console.log(err))

let deposit = {
    commitment: '',
    nullifier: '',
    secret: '',
    nullifierHash: '',
}
let commitment: any
generateDeposit()
    .then((res) => {
        commitment = Array.from(bigintToUint8Array(BigInt(res.commitment.toString())))
        deposit.nullifier = res.nullifier.toString()
        deposit.secret = res.secret.toString()
        deposit.nullifierHash = res.nullifierHash.toString()
        deposit.commitment = res.commitment.toString()
    })
    .catch((err) => console.log(err))

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
            const [_, nonce] = PublicKey.findProgramAddressSync(
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
            const txId = await provider.sendAndConfirm(tx)

            return txId
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
    const { program, accounts, programId } = useSukuraProgram()

    const accountQuery = useQuery({
        queryKey: ['sukura', 'fetch', { cluster, account }],
        queryFn: () => program.account.sukura.fetch(account),
    })
    const provider = useAnchorProvider()
    const { connection } = useConnection()

    const depositMutation = useMutation({
        mutationKey: ['sukura', 'deposit', { cluster, account }],
        mutationFn: async () => {
            tree.insert(deposit.commitment)
            const [vault, _] = PublicKey.findProgramAddressSync([account.toBuffer()], programId)

            const txIns = await program.methods
                .deposit(commitment)
                .accountsStrict({
                    pool: account,
                    sender: provider.publicKey,
                    vault,
                    poolSigner: vault,
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
            const txId = await provider.sendAndConfirm(tx)

            return txId
        },
        onSuccess: (tx) => {
            transactionToast(tx)
            return accounts.refetch()
        },
        onError: (err) => toast.error(`Error depositing: ${err}`),
    })

    const withdrawMutation = useMutation({
        mutationKey: ['sukura', 'withdraw', { cluster, account }],
        mutationFn: async () => {
            const [vault, _] = PublicKey.findProgramAddressSync([account.toBuffer()], programId)

            const recipient = new PublicKey('CU49N3WyQAr9bPmqWvstkWu2gY7wmAHYkSjBbiDQtQQq')
            const relayerWallet = (await getOrCreateRelayerWallet()) as string

            const { pathElements, pathIndices } = tree.path(0)
            const input = {
                root: tree.root,
                nullifierHash: deposit.nullifierHash,
                nullifier: deposit.nullifier,
                recipient: solanaAddressToBigInt(recipient.toString()),
                secret: deposit.secret,
                pathElements: pathElements.map((num: any) => num.toString()),
                pathIndices,
                relayer: solanaAddressToBigInt(relayerWallet),
                fee,
            }

            const { proof, publicSignals } = await generateWitnessAndProve(input)
            const proofArray = parseProofToBytesArray(proof)
            const publicSignalsArray = parseToBytesArray(publicSignals)

            const proofInstruction = Buffer.from([...proofArray, ...publicSignalsArray.flat()])
            const nullifierHash = [...bigintToUint8Array(BigInt(deposit.nullifierHash))]
            const root = [...bigintToUint8Array(BigInt(input.root))]

            const instruction = await program.methods
                .withdraw(nullifierHash, root, proofInstruction)
                .accountsStrict({
                    recipient,
                    pool: account,
                    systemProgram: SystemProgram.programId,
                    vault: vault,
                    poolSigner: vault,
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
