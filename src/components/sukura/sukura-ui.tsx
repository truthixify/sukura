'use client'

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import React, { useEffect, useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { Button, ellipsify } from '../ui/ui-layout'
import { useSukuraProgram, useSukuraProgramAccount } from './sukura-data-access'
import {
    bigintToUint8Array,
    createPoseidonHash,
    generateDeposit,
    generateWitnessAndProve,
    handleNoteUpload,
    NoteData,
    parseProofToBytesArray,
    parseToBytesArray,
    solanaAddressToBigInt,
} from 'utils/utils'
import toast from 'react-hot-toast'
import { poolAmountList } from '../admin/admin-ui'
import BN from 'bn.js'
import { IMerkleTree } from '@/app/api/merkleTree/model'
import MerkleTree from 'fixed-merkle-tree'
import { getOrCreateRelayerWallet } from 'utils/relayer'
import { Groth16Proof, PublicSignals } from 'snarkjs'
import Image from 'next/image'
import ArrowUp from '../../../public/arrowup.svg'

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
    const defaultPublicKey = new PublicKey('11111111111111111111111111111111')
    const { accounts, getProgramAccount } = useSukuraProgram()

    const [amountPerWithdrawal, setAmountPerWithdrawal] = useState<number>(poolAmountList[0])
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [depositNoteData, setDepositNoteData] = useState<NoteData | null>(null)
    const [withdrawalNoteData, setWithdrawalNoteData] = useState<NoteData | null>(null)
    const [recipientAddress, setRecipientAddress] = useState<PublicKey>()
    const [isActiveTabDeposit, setIsActiveTabDeposit] = useState<boolean>(true)
    const [commitment, setCommitment] = useState<string>('')
    const [isNoteSaved, setIsNoteSaved] = useState<boolean>(false)
    const [noteFileName, setNoteFileName] = useState<string>('')
    const [isNoteUploaded, setIsNoteUploaded] = useState<boolean>(false)
    const [isGenProof, setIsGenProof] = useState<boolean>(false)
    const [proof, setProof] = useState<Groth16Proof | null>(null)
    const [publicSignals, setPublicSignals] = useState<PublicSignals | null>(null)
    const [withdrawalRoot, setWithdrawalRoot] = useState<string>('')
    const [withdrawalNullifierHash, setWithdrawalNullifierHash] = useState<string>('')
    const [withdrawalFee, setWithdrawalFee] = useState<BN>(new BN(0))
    const [relayerWallet, setRelayerWallet] = useState<PublicKey | null>(null)
    const [account, setAccount] = useState<PublicKey>(
        () =>
            accounts.data?.find(
                (account) =>
                    account.account.amountPerWithdrawal.toNumber() ===
                    poolAmountList[0] * LAMPORTS_PER_SOL
            )?.publicKey || defaultPublicKey
    )

    const { accountQuery, depositMutation, withdrawMutation } = useSukuraProgramAccount({
        account,
    })

    const handleAmountChange = (
        e: React.MouseEvent<HTMLButtonElement>,
        amountPerWithdrawal: number,
        index: number
    ) => {
        setAmountPerWithdrawal(amountPerWithdrawal)
        const account =
            accounts.data?.find(
                (account) =>
                    account.account.amountPerWithdrawal.toNumber() ===
                    amountPerWithdrawal * LAMPORTS_PER_SOL
            )?.publicKey || defaultPublicKey
        setAccount(account)
        const rangeSelector = document.querySelector('.range-selector')
        const prevButtons = document.querySelectorAll('.range-selector button')

        if (rangeSelector) {
            rangeSelector.style.setProperty('--onpointrx', `${index * 33.33333333}%`)

            prevButtons.forEach((btn) => {
                btn.style.backgroundColor = '#FFFFFF'
            })

            for (let i = 0; i < index; i++) {
                prevButtons[i].style.backgroundColor = '#7AFB96'
            }
        }
    }

    const handleDepositNoteDownload = async () => {
        const deposit = await generateDeposit()
        const commitment = deposit.commitment.toString()
        const nullifier = deposit.nullifier.toString()
        const secret = deposit.secret.toString()
        const nullifierHash = deposit.nullifierHash.toString()

        const data = {
            secret,
            nullifier,
            nullifierHash,
            commitment,
            amountPerWithdrawal: amountPerWithdrawal,
        }

        setCommitment(commitment)

        try {
            const jsonData = JSON.stringify(data, null, 2)
            const noteName = `sukura-sol-${amountPerWithdrawal}-${nullifierHash.substring(0, 5)}${commitment.substring(0, 5)}.json`
            setNoteFileName(noteName)

            // Use File System Access API for user-selected save location
            if (window.showSaveFilePicker) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: noteName,
                    types: [
                        {
                            description: 'JSON File',
                            accept: { 'application/json': ['.json'] },
                        },
                    ],
                })

                const writable = await fileHandle.createWritable()
                await writable.write(jsonData)
                await writable.close()
            } else {
                // Fallback for browsers that do not support File System Access API
                const blob = new Blob([jsonData], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `sukura-${nullifierHash}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            }

            return true
        } catch (err) {
            throw err
        }
    }

    const handleRecipientAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setRecipientAddress(new PublicKey(event.target.value))
        } catch (err) {
            toast.error('Invalid recipient address. Please enter a valid Solana address.')
        }
    }

    const handleDepositModal = async () => {
        try {
            const noteSavedSuccessfully = await handleDepositNoteDownload()

            if (noteSavedSuccessfully) {
                document.getElementById('deposit-modal')?.showModal()
            }
        } catch (err) {
            toast.error('Failed to save note file')
        }
    }

    const handleDeposit = async () => {
        await depositMutation.mutateAsync(commitment)
        setIsNoteSaved(false)
    }

    const handleWithdrawalNoteUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0]
            setSelectedFile(file)

            try {
                const parsedData = await handleNoteUpload(file)
                parsedData
                setWithdrawalNoteData(parsedData)
                setIsNoteUploaded(true)
            } catch (err) {
                toast.error('Invalid file format. Please upload a valid JSON file.')
            }
        }
    }

    const handleProofGen = async () => {
        if (!withdrawalNoteData) {
            toast.error('Please upload a valid note file first.')
            return
        }

        if (!recipientAddress) {
            toast.error('Please enter a valid recipient address.')
            return
        }

        const { secret, nullifier, nullifierHash, commitment, amountPerWithdrawal } =
            withdrawalNoteData
        setAmountPerWithdrawal(amountPerWithdrawal)
        const account =
            accounts.data?.find(
                (account) =>
                    account.account.amountPerWithdrawal.toNumber() ===
                    amountPerWithdrawal * LAMPORTS_PER_SOL
            )?.publicKey || defaultPublicKey

        const response = await fetch(`/api/merkleTree/${account.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            toast.error('Merkle Tree query failed')
            return
        }

        const treeData: IMerkleTree = await response.json()
        const { tree, vaultAddress } = treeData
        const poseidonHash = await createPoseidonHash()
        const deTree = MerkleTree.deserialize(tree, poseidonHash)
        const index = deTree.indexOf(commitment)
        const relayerWallet = (await getOrCreateRelayerWallet()) as string
        const fee = new BN(amountPerWithdrawal * 0.01)
        const { pathElements, pathIndices } = deTree.path(index)
        const input = {
            root: deTree.root,
            nullifierHash,
            nullifier,
            recipient: solanaAddressToBigInt(recipientAddress.toString()),
            secret,
            pathElements,
            pathIndices,
            relayer: solanaAddressToBigInt(relayerWallet),
            fee: fee.toString(),
        }

        try {
            setIsGenProof(true)
            const { proof, publicSignals } = await generateWitnessAndProve(input)
            setProof(proof)
            setPublicSignals(publicSignals)
        } catch (err) {
            console.log('pppppp')
            toast.error(`Failed to generate valid proof: ${err}`)
        } finally {
            setIsGenProof(true)
        }

        if (!relayerWallet) {
            toast.error('Relayer is not available.')
            return
        }

        if (isNoteUploaded && isGenProof) {
            document.getElementById('withdraw-modal')?.showModal()
        } else {
            console.log(proof)
            toast.error('Failed to upload note')
        }

        setWithdrawalFee(fee)
        setWithdrawalNullifierHash(nullifierHash)
        setWithdrawalRoot(input.root.toString())
        setRelayerWallet(new PublicKey(relayerWallet))
    }

    const handleWithdrawal = async () => {
        await withdrawMutation?.mutateAsync({
            nullifierHash: withdrawalNullifierHash,
            root: withdrawalRoot,
            proof,
            publicSignals,
            fee: withdrawalFee,
            recipientAddress: recipientAddress as PublicKey,
            relayerWallet: relayerWallet as PublicKey,
        })
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

    // if(isGenProof) {
    //     return <span className="loading loading-spinner loading-lg"></span>
    // }

    return false /*accountQuery.isLoading*/ ? (
        <span className="loading loading-spinner loading-lg"></span>
    ) : (
        <div className=" min-w-[600px]">
            <div className="tab-header flex justify-between items-center h-12 w-2/5 bg-base-300 rounded-full py-2 px-2">
                <button
                    className={`w-1/2 h-10 btn btn-xs hover:bg-base-200 ${isActiveTabDeposit ? 'bg-base-200 text-white' : 'bg-base-300 border-none'}`}
                    onClick={() => setIsActiveTabDeposit(true)}
                >
                    Deposit
                </button>
                <button
                    className={`w-1/2 h-10 btn btn-xs hover:bg-base-200 ${!isActiveTabDeposit ? 'bg-base-200 text-white' : 'bg-base-300 border-none'}`}
                    onClick={() => setIsActiveTabDeposit(false)}
                >
                    Withdraw
                </button>
            </div>
            {isActiveTabDeposit && (
                <div className="text-neutral-content bg-base-100 border-2 border-base-200 rounded-lg my-2 py-8 px-8 tab-body text-white">
                    <div className="flex flex-col items-start">
                        <div className="mb-8">
                            <h1 className="my-4">Deposit Token</h1>
                            <button className="btn btn-xs">SOL</button>
                        </div>
                        <h1 className="text-xl my-4">Amount to Deposit</h1>
                        <div className="w-full rounded-full bg-base-300 p-4">
                            <div className="range-selector flex justify-between h-[8px] w-full bg-base-200 rounded-full">
                                {poolAmountList.map((amount: number, index: number) => (
                                    <button
                                        key={amount}
                                        aria-label="Radio"
                                        className={`cursor-pointer ${amountPerWithdrawal === amount ? 'range-btn-active' : ''}`}
                                        onClick={(e) => handleAmountChange(e, amount, index)}
                                        id={`amount-${amount}`}
                                    ></button>
                                ))}
                            </div>
                        </div>
                        <div className="w-full flex justify-between">
                            {poolAmountList.map((amount: number) => (
                                <label
                                    key={amount}
                                    htmlFor={`amount-${amount}`}
                                    className="cursor-pointer flex flex-col items-center text-neutral text-xs"
                                >
                                    <Image src={ArrowUp} alt="arrow up" width={8} />
                                    <p>{amount} SOL</p>
                                </label>
                            ))}
                        </div>
                        <Button
                            className="btn lg:btn-md btn-outline mt-12 self-center"
                            onClick={handleDepositModal}
                            disabled={depositMutation?.isPending}
                        >
                            Make Deposit
                        </Button>
                    </div>
                    {!depositMutation.isPending && (
                        <dialog id="deposit-modal" className="modal">
                            <div className="modal-box text-gray-500">
                                <form method="dialog">
                                    <button className="btn btn-sm btn-ghost absolute right-2 top-2">
                                        ✕
                                    </button>
                                </form>
                                <div className="my-8">
                                    <h2 className="text-lg font-bold">
                                        Important: Save Your Note!
                                    </h2>
                                    <p className="my-4">
                                        You have successfully downloaded your withdrawal note. This
                                        note contains essential information that you will need to
                                        withdraw your funds.
                                        <br />
                                        File name:{' '}
                                        <span className="font-semibold text-blue-600">
                                            {noteFileName}
                                        </span>
                                    </p>
                                    <p className="mt-2 font-semibold">
                                        If you lose this note, you will not be able to withdraw your
                                        funds.
                                    </p>
                                    <p className="my-4">
                                        Please ensure you store it safely, such as in a secure
                                        folder or an external drive. You can also back it up on a
                                        password-protected device.
                                    </p>
                                </div>
                                <div className="flex flex-col items-start gap-4">
                                    <div className="flex">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-base mr-4"
                                            id="deposit-checkbox"
                                            onChange={(e) => setIsNoteSaved(e.target.checked)}
                                        />
                                        <label htmlFor="deposit-checkbox">
                                            I have backed up my note safely
                                        </label>
                                    </div>
                                    <Button onClick={handleDeposit} disabled={!isNoteSaved}>
                                        Send Deposit
                                    </Button>
                                </div>
                            </div>
                        </dialog>
                    )}
                </div>
            )}
            {!isActiveTabDeposit && (
                <div className="text-neutral-content bg-base-100 border-2 border-base-200 rounded-lg my-2 p-8 tab-body text-white">
                    <div className="flex flex-col items-center text-center gap-12">
                        <div className="flex flex-col items-start gap-2 w-full">
                            <label htmlFor="file">Note</label>
                            <input
                                type="file"
                                id="file"
                                onChange={handleWithdrawalNoteUpload}
                                className="file-input file-input-primary w-full"
                                required
                            />
                        </div>
                        <div className="flex flex-col items-start gap-2 w-full">
                            <label htmlFor="address">Recipient Address</label>
                            <input
                                type="text"
                                id="address"
                                className="input input-primary w-full"
                                onChange={handleRecipientAddressChange}
                                autoCorrect="off"
                                autoComplete="off"
                                spellCheck="false"
                                required
                            />
                        </div>
                        <Button
                            className="btn lg:btn-md btn-outline btn-block"
                            onClick={handleProofGen}
                            disabled={
                                withdrawMutation?.isPending ||
                                !withdrawalNoteData ||
                                !recipientAddress
                            }
                        >
                            Withdraw
                        </Button>
                    </div>
                    {!withdrawMutation.isPending && (
                        <dialog id="withdraw-modal" className="modal">
                            <div className="modal-box">
                                <form method="dialog">
                                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                                        ✕
                                    </button>
                                </form>
                                <div className="p-4">
                                    <h2 className="text-lg font-bold text-red-600">
                                        Valid Withdrawal Proof
                                    </h2>
                                    <p className="mt-2 text-gray-700">
                                        Your withdrawal proof has been successfully confirmed.
                                    </p>
                                </div>
                                <div className="flex flex-col items-start gap-4">
                                    <Button
                                        className="btn lg:btn-md btn-outline w-full"
                                        onClick={handleWithdrawal}
                                        disabled={!isGenProof}
                                    >
                                        Send Withdrawal
                                    </Button>
                                </div>
                            </div>
                        </dialog>
                    )}
                </div>
            )}
        </div>
    )
}
