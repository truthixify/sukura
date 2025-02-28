'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { ellipsify } from '../ui/ui-layout'
import { useSukuraProgram, useSukuraProgramAccount } from './sukura-data-access'
import { handleNoteUpload, NoteData } from 'utils/utils'

export function SukuraCreate() {
    const { initialize } = useSukuraProgram()

    return (
        <button
            className="btn btn-xs lg:btn-md btn-primary"
            onClick={() => initialize.mutateAsync()}
            disabled={initialize.isPending}
        >
            Create {initialize.isPending && '...'}
        </button>
    )
}

export function SukuraList() {
    const { accounts, getProgramAccount } = useSukuraProgram()

    if (getProgramAccount.isLoading) {
        return <span className="loading loading-spinner loading-lg"></span>
    }
    if (!getProgramAccount.data?.value) {
        return (
            <div className="alert alert-info flex justify-center">
                <span>
                    Program account not found. Make sure you have deployed the program and are on
                    the correct cluster.
                </span>
            </div>
        )
    }
    return (
        <div className={'space-y-6'}>
            {accounts.isLoading ? (
                <span className="loading loading-spinner loading-lg"></span>
            ) : accounts.data?.length ? (
                <div className="grid md:grid-cols-2 gap-4">
                    {accounts.data?.map((account) => (
                        <SukuraCard
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

function SukuraCard({ account }: { account: PublicKey }) {
    const { accountQuery, depositMutation, withdrawMutation } = useSukuraProgramAccount({ account })

    const amount = useMemo(
        () => accountQuery.data?.amountPerWithdrawal ?? 0,
        [accountQuery.data?.amountPerWithdrawal]
    )

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [noteData, setNoteData] = useState<NoteData | null>(null)

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log(event.target.files)
        console.log('hi')
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0]
            setSelectedFile(file)

            try {
                const parsedData = await handleNoteUpload(file)
                setNoteData(parsedData) // Store parsed data in state
            } catch (error) {
                console.error('Invalid file format', error)
                alert('Invalid file format. Please upload a valid JSON file.')
            }
        }
    }

    const handleWithdraw = async () => {
        if (!noteData) {
            console.log(noteData)
            alert('Please upload a valid note file first.')
            return
        }
        // console.log(noteData)

        await withdrawMutation.mutateAsync(noteData)
    }

    return accountQuery.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
    ) : (
        <>
            <div className="card card-bordered border-base-300 border-4 text-neutral-content">
                <div className="card-body items-center text-center">
                    <div className="space-y-6">
                        <h2
                            className="card-title justify-center text-3xl cursor-pointer"
                            onClick={() => accountQuery?.refetch()}
                        >
                            {amount.toString()}
                        </h2>
                        <div className="card-actions justify-around">
                            <button
                                className="btn btn-xs lg:btn-md btn-outline"
                                onClick={() => depositMutation.mutateAsync()}
                                disabled={depositMutation?.isPending}
                            >
                                Deposit
                            </button>
                        </div>
                        <div className="text-center space-y-4">
                            <p>
                                <ExplorerLink
                                    path={`account/${account}`}
                                    label={ellipsify(account.toString())}
                                />
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card card-bordered border-base-300 border-4 text-neutral-content">
                <div className="card-body items-center text-center">
                    <div className="space-y-6">
                        <h2
                            className="card-title justify-center text-3xl cursor-pointer"
                            onClick={() => accountQuery?.refetch()}
                        >
                            {amount.toString()}
                        </h2>
                        <div className="card-actions justify-around">
                            <input type="file" onChange={handleFileChange} className="file-input" />
                            <button
                                className="btn btn-xs lg:btn-md btn-outline"
                                onClick={handleWithdraw}
                                disabled={withdrawMutation?.isPending || !noteData}
                            >
                                Withdraw
                            </button>
                        </div>
                        <div className="text-center space-y-4">
                            <p>
                                <ExplorerLink
                                    path={`account/${account}`}
                                    label={ellipsify(account.toString())}
                                />
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
