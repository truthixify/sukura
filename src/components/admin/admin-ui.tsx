'use client'

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useEffect, useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { Button, ellipsify, RangeSelector, Spinner } from '../ui/ui-layout'
import { useSukuraProgram, useSukuraProgramAccount } from './admin-data-access'
import { uint8ArrayToBigInt } from 'utils/utils'
import { BN } from 'bn.js'

export function SukuraPoolCreate() {
    const { initializePool, accounts } = useSukuraProgram()
    const [amountPerWithdrawal, setAmountPerWithdrawal] = useState<number | null>(null)
    const [existingPools, setExistingPools] = useState<number[]>([])

    useEffect(() => {
        if (!accounts.data) return

        const foundPools = [0.1, 1, 10, 100].filter((amount) => {
            const account = accounts.data.some(
                (account) =>
                    account.account.amountPerWithdrawal.toNumber() === amount * LAMPORTS_PER_SOL
            )
        })

        setExistingPools(foundPools)
    }, [accounts.data])
    const poolExists = amountPerWithdrawal !== null && existingPools.includes(amountPerWithdrawal)

    if (initializePool.isPending) {
        return <Spinner overlay={true} />
    }

    return (
        <div className="card-actions flex-col justify-evenly items-center">
            <RangeSelector
                amountPerWithdrawal={amountPerWithdrawal as number}
                handleAmountChange={setAmountPerWithdrawal}
            />
            {initializePool.isPending && <progress className="progress w-1/2"></progress>}
            <Button
                className="btn btn-small lg:btn-md btn-primary"
                onClick={() => initializePool.mutateAsync(amountPerWithdrawal)}
                disabled={initializePool.isPending || !amountPerWithdrawal || poolExists}
            >
                Create Pool {initializePool.isPending && '...'}
            </Button>
        </div>
    )
}

export function SukuraPoolList() {
    const { accounts, getProgramAccount } = useSukuraProgram()

    if (getProgramAccount.isLoading) {
        return <Spinner />
    }

    if (!getProgramAccount.data?.value) {
        return (
            <div className="alert alert-warning flex justify-center">
                <span>
                    Program account not found. Make sure you have deployed the program and are on
                    the correct cluster.
                </span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1>Active Pool List</h1>
            {accounts.isLoading ? (
                <Spinner />
            ) : accounts.data?.length ? (
                <div className="grid md:grid-cols-1 gap-4">
                    {accounts.data?.map((account) => (
                        <SukuraPoolCard
                            key={account.publicKey.toString()}
                            account={account.publicKey}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center">
                    <h2 className={'text-2xl'}>No accounts</h2>
                    No accounts found. Create one above to get started.
                </div>
            )}
        </div>
    )
}

function SukuraPoolCard({ account }: { account: PublicKey }) {
    const { accountQuery } = useSukuraProgramAccount({ account })

    const amount = useMemo(
        () => accountQuery.data?.amountPerWithdrawal ?? new BN(0),
        [accountQuery.data?.amountPerWithdrawal]
    )
    const merkleRoot = useMemo(
        () => accountQuery.data?.merkleRoot ?? [],
        [accountQuery.data?.merkleRoot]
    )
    const nonce = useMemo(() => accountQuery.data?.nonce ?? 0, [accountQuery.data?.nonce])
    const vault = useMemo(() => accountQuery.data?.vault ?? '', [accountQuery.data?.vault])

    return accountQuery.isLoading ? (
        <Spinner overlay={true} />
    ) : (
        <>
            <div className="card card-bordered border-base-300 border-4 text-neutral-content bg-gradient-primary">
                <div className="card-body items-start">
                    <div className="space-y-6">
                        <h2
                            className="card-title justify-start text-xl cursor-pointer"
                            onClick={() => accountQuery?.refetch()}
                        >
                            Pool:
                            <ExplorerLink
                                path={`account/${account}`}
                                label={ellipsify(account.toString())}
                            />
                        </h2>
                        <div className="flex flex-col items-start gap-4 my-8">
                            <p>Nonce: {nonce}</p>
                            <p>
                                Amount Per Withdrawal:{' '}
                                {(amount.toNumber() / LAMPORTS_PER_SOL).toString()} SOL
                            </p>
                            <p>
                                Merkle Root:{' '}
                                {ellipsify(
                                    uint8ArrayToBigInt(new Uint8Array(merkleRoot)).toString(),
                                    10
                                )}
                            </p>
                            <p>
                                Vault:
                                <ExplorerLink
                                    path={`account/${vault}`}
                                    label={ellipsify(vault.toString())}
                                />
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
