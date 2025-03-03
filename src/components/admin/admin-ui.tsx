'use client'

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { ellipsify } from '../ui/ui-layout'
import { useSukuraProgram, useSukuraProgramAccount } from './admin-data-access'
import { uint8ArrayToBigInt } from 'utils/utils'
import { BN } from 'bn.js'
import Loader from '../ui/loader'

export const poolAmountList = [0.1, 1, 10, 100]

export function SukuraPoolCreate() {
    const { initializePool } = useSukuraProgram()
    const [amountPerWithdrawal, setAmountPerWithdrawal] = useState<number | null>(null)

    return (
        <div className="card-actions flex-col justify-evenly items-center">
            <div className="flex space-x-4 my-8">
                {poolAmountList.map((amount) => (
                    <button
                        key={amount}
                        aria-label="Radio"
                        className={`btn btn-xs lg:btn-md ${amountPerWithdrawal === amount ? 'btn-success' : 'btn-neutral'}`}
                        onClick={() => setAmountPerWithdrawal(amount)}
                    >
                        {amount} SOL
                    </button>
                ))}
            </div>
            {initializePool.isPending && <progress className="progress w-1/2"></progress>}
            <button
                className="btn btn-small lg:btn-md btn-primary"
                onClick={() => initializePool.mutateAsync(amountPerWithdrawal)}
                disabled={initializePool.isPending || !amountPerWithdrawal}
            >
                Create Pool {initializePool.isPending && '...'}
            </button>
        </div>
    )
}

export function SukuraPoolList() {
    const { accounts, getProgramAccount } = useSukuraProgram()

    if (getProgramAccount.isLoading) {
        return <Loader />
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
        <div className={'space-y-6'}>
            <h1>Active Pool List</h1>
            {accounts.isLoading ? (
                <span className="text-center loading loading-spinner loading-lg"></span>
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
        <Loader />
    ) : (
        <>
            <div className="card card-bordered border-base border-4 text-neutral-content">
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
