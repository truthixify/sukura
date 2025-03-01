'use client'

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useEffect, useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { ellipsify } from '../ui/ui-layout'
import { useSukuraProgram, useSukuraProgramAccount } from './sukura-data-access'
import { handleNoteUpload, NoteData } from 'utils/utils'
import toast from 'react-hot-toast'
import { poolAmountList } from '../admin/admin-ui'
import BN from 'bn.js'

type MerkleTreeData = {
    merkleTree: {
        levels: number
        filledSubtrees: number[][]
        roots: number[][]
        currentRootIndex: BN
        nextIndex: number
        zeros: number[][]
    }
    merkleRoot: number[]
    commitments: number[][]
    nullifiersHashes: number[][]
    amountPerWithdrawal: BN
    nonce: number
    vault: PublicKey
}

export function SukuraUi() {
    const [amountPerWithdrawal, setAmountPerWithdrawal] = useState<number>(poolAmountList[0])
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [noteData, setNoteData] = useState<NoteData | null>(null)
    const [recipientAddress, setRecipientAddress] = useState<PublicKey>()

    const { accounts, getProgramAccount } = useSukuraProgram()
    const { accountQuery, depositMutation, withdrawMutation } = useSukuraProgramAccount({
        amountPerWithdrawal,
    })

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0]
            setSelectedFile(file)

            try {
                const parsedData = await handleNoteUpload(file)
                parsedData
                setNoteData(parsedData)
                setAmountPerWithdrawal(parsedData.amountPerWithdrawal / LAMPORTS_PER_SOL)
            } catch (err) {
                toast.error('Invalid file format. Please upload a valid JSON file.')
            }
        }
    }

    const handleRecipientAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setRecipientAddress(new PublicKey(event.target.value))
        } catch (err) {
            toast.error('Invalid recipient address. Please enter a valid Solana address.')
        }
    }

    const handleWithdraw = async () => {
        if (!noteData) {
            toast.error('Please upload a valid note file first.')
            return
        }

        if (!recipientAddress) {
            toast.error('Please enter a valid recipient address.')
            return
        }

        await withdrawMutation?.mutateAsync({ noteData, recipientAddress })
    }

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

    return accountQuery?.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
    ) : (
        <div className="tabs tabs-lift">
            <input
                type="radio"
                name="my_tabs_4"
                className="tab"
                defaultChecked
                aria-label="Deposit"
            />
            <div className="card card-bordered border-base-300 border-4 text-neutral-content tab-content">
                <div className="card-body items-center text-center">
                    <div className="space-y-6">
                        <div className="flex space-x-4 my-8">
                            {poolAmountList.map((amount: number) => (
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
                        <div className="card-actions justify-around">
                            <button
                                className="btn btn-xs lg:btn-md btn-outline"
                                onClick={() => depositMutation?.mutateAsync()}
                                disabled={depositMutation?.isPending}
                            >
                                Deposit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <input type="radio" name="my_tabs_4" className="tab" aria-label="Withdraw" />
            <div className="card card-bordered border-base-300 border-4 text-neutral-content tab-content">
                <div className="card-body items-center text-center">
                    <div className="space-y-6">
                        <div className="card-actions justify-around">
                            <input type="file" onChange={handleFileChange} className="file-input" />
                            <input
                                type="text"
                                className="w-full h-10 bg-inherit border-base-300 border-4 rounded-lg px-4"
                                placeholder="Recipient address"
                                onChange={handleRecipientAddressChange}
                                autoCorrect="off"
                                autoComplete="off"
                                spellCheck="false"
                            />
                            <button
                                className="btn btn-xs lg:btn-md btn-outline"
                                onClick={handleWithdraw}
                                disabled={
                                    withdrawMutation?.isPending || !noteData || !recipientAddress
                                }
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
