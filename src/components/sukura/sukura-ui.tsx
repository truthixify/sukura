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
    const [isActiveTabDeposit, setIsActiveTabDeposit] = useState<boolean>(true)

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
        <div className="my-12">
            <div className="tab-header flex justify-between">
                <button
                    className={`btn ${isActiveTabDeposit && 'btn-primary'}`}
                    onClick={() => setIsActiveTabDeposit(true)}
                >
                    Deposit
                </button>
                <button
                    className={`btn ${!isActiveTabDeposit && 'btn-primary'}`}
                    onClick={() => setIsActiveTabDeposit(false)}
                >
                    Withdraw
                </button>
            </div>
            {isActiveTabDeposit && (
                <div className="border-base-300 border-2 my-8 p-8 text-neutral-content tab-body">
                    <div className="space-y-6 flex flex-col items-start w-full">
                        <div className="tooltip" data-tip="The pool deposit amount">
                            Pool Amount <button className="btn btn-xs btn-success">i</button>
                        </div>
                        <div className="w-full flex justify-between my-8">
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
                        <button
                            className="btn lg:btn-md btn-outline btn-primary w-full"
                            onClick={() => depositMutation?.mutateAsync()}
                            disabled={depositMutation?.isPending}
                        >
                            Deposit
                        </button>
                    </div>
                </div>
            )}
            {!isActiveTabDeposit && (
                <div className="border-base-300 border-2 text-neutral-content my-8 py-8 px-4 tab-body">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="space-y-6">
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col items-start gap-2">
                                    <label htmlFor="file">Note</label>
                                    <input
                                        type="file"
                                        id="file"
                                        onChange={handleFileChange}
                                        className="file-input file-input-primary"
                                        required
                                    />
                                </div>
                                <div className="flex flex-col items-start gap-2">
                                    <label htmlFor="address">Recipient Address</label>
                                    <input
                                        type="text"
                                        id="address"
                                        className="input input-primary w-full"
                                        placeholder="Address"
                                        onChange={handleRecipientAddressChange}
                                        autoCorrect="off"
                                        autoComplete="off"
                                        spellCheck="false"
                                        required
                                    />
                                </div>
                                <button
                                    className="btn lg:btn-md btn-outline btn-primary"
                                    onClick={handleWithdraw}
                                    disabled={
                                        withdrawMutation?.isPending ||
                                        !noteData ||
                                        !recipientAddress
                                    }
                                >
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
