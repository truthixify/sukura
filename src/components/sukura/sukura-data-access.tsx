'use client'

import { getSukuraProgram, getSukuraProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

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
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ sukura: keypair.publicKey }).signers([keypair]).rpc(),
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

  const closeMutation = useMutation({
    mutationKey: ['sukura', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ sukura: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['sukura', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ sukura: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['sukura', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ sukura: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['sukura', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ sukura: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
