'use client'

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import React, { useRef, useState } from 'react'
import { Button, formatError, RangeSelector, Spinner, useErrorToast } from '../ui/ui-layout'
import { useSukuraProgram, useSukuraProgramAccount } from './sukura-data-access'
import {
    createPoseidonHash,
    generateDeposit,
    generateWitnessAndProve,
    handleNoteUpload,
    NoteData,
    solanaAddressToBigInt,
} from '@/utils/utils'
import BN from 'bn.js'
import { IMerkleTree } from '@/app/api/merkleTree/model'
import MerkleTree from 'fixed-merkle-tree'
import { getOrCreateRelayerWallet } from '@/utils/relayer'
import { Groth16Proof, PublicSignals } from 'snarkjs'
import Image from 'next/image'
import FileArrowUp from '../../../public/FileArrowUp.svg'
import Trash from '../../../public/Trash.svg'
import X from '../../../public/X.svg'
import CancelBtn from '../../../public/cancel.svg'

export function SukuraUi() {
    const { accounts, getProgramAccount } = useSukuraProgram()

    const [amountPerWithdrawal, setAmountPerWithdrawal] = useState<number | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [withdrawalNoteData, setWithdrawalNoteData] = useState<NoteData | null>(null)
    const [recipientAddress, setRecipientAddress] = useState<PublicKey>()
    const [isActiveTabDeposit, setIsActiveTabDeposit] = useState<boolean>(true)
    const [commitment, setCommitment] = useState<string>('')
    const [isNoteSaved, setIsNoteSaved] = useState<boolean>(false)
    const [noteFileName, setNoteFileName] = useState<string>('')
    const [isNoteUploaded, setIsNoteUploaded] = useState<boolean>(false)
    const [isGenProof, setIsGenProof] = useState<boolean>(false)
    const [isProofValid, setIsProofValid] = useState<boolean>(false)
    const [proof, setProof] = useState<Groth16Proof | null>(null)
    const [publicSignals, setPublicSignals] = useState<PublicSignals | null>(null)
    const [withdrawalRoot, setWithdrawalRoot] = useState<string>('')
    const [withdrawalNullifierHash, setWithdrawalNullifierHash] = useState<string>('')
    const [withdrawalFee, setWithdrawalFee] = useState<BN>(new BN(0))
    const [relayerWallet, setRelayerWallet] = useState<PublicKey | null>(null)
    const [vaultAddress, setVaultAddress] = useState<PublicKey | null>(null)
    const [account, setAccount] = useState<PublicKey | null>(null)
    const [processUploadedNote, setProcessUploadedNote] = useState(false)

    const { accountQuery, depositMutation, withdrawMutation } = useSukuraProgramAccount({
        account: account as PublicKey,
    })

    const withdrawModalRef = useRef<HTMLDialogElement | null>(null)
    const depositModalRef = useRef<HTMLDialogElement | null>(null)

    const errorToast = useErrorToast()

    const handleAccountChange = (account: PublicKey, amount: number) => {
        setAmountPerWithdrawal(amount)
        setAccount(account)
    }

    const handleRecipientAdrressDelete = () => {
        setRecipientAddress(undefined)
        document.getElementById('address').value = ''
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
            amountPerWithdrawal: (amountPerWithdrawal as number) / LAMPORTS_PER_SOL,
        }

        setCommitment(commitment)

        try {
            const jsonData = JSON.stringify(data, null, 2)
            const noteName = `sukura-sol-${(amountPerWithdrawal as number) / LAMPORTS_PER_SOL}-${nullifierHash.substring(0, 5)}${commitment.substring(0, 5)}.json`
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
            errorToast('Invalid recipient address', 'Please enter a valid Solana address')
        }
    }

    const handleDepositModal = async () => {
        try {
            const noteSavedSuccessfully = await handleDepositNoteDownload()

            if (noteSavedSuccessfully) {
                depositModalRef.current?.showModal()
            }
        } catch (err) {
            errorToast('Failed to save note file', formatError(err))
        }
    }

    const handleDeposit = async () => {
        try {
            await depositMutation.mutateAsync(commitment)
            setIsNoteSaved(false)
            setNoteFileName('')
            setCommitment('')
        } catch (err) {
            setIsNoteSaved(false)
            setNoteFileName('')
            setCommitment('')
        }
    }

    const handleWithdrawalNoteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            setSelectedFile(file)
            setNoteFileName(file.name)

            try {
                const parsedData = await handleNoteUpload(file)
                parsedData
                setWithdrawalNoteData(parsedData)

                setIsNoteUploaded(true)
                setProcessUploadedNote(true)
                setTimeout(() => setProcessUploadedNote(false), 2000)

                // try {
                //     const log = await fetchDepositEvent(parsedData.commitment, programId)
                //     console.log(log)
                // } catch (err) {
                //     console.log(err)
                // }
            } catch (err) {
                errorToast('Invalid file format', 'Please upload a valid JSON file')
            }
        }
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0]
            setSelectedFile(file)
            setNoteFileName(file.name)

            try {
                const parsedData = await handleNoteUpload(file)
                parsedData
                setWithdrawalNoteData(parsedData)

                setIsNoteUploaded(true)
                setProcessUploadedNote(true)
                setTimeout(() => setProcessUploadedNote(false), 2000)
            } catch (err) {
                errorToast('Invalid file format', 'Please upload a valid JSON file')
            }
        }
    }

    const handleDeleteUploadedNote = () => {
        setSelectedFile(null)
        setIsNoteUploaded(false)
        setWithdrawalNoteData(null)
        setRecipientAddress(undefined)
    }

    const handleProofGen = async () => {
        setIsGenProof(true)
        if (!withdrawalNoteData) {
            errorToast('Invalid note file', 'Please upload a valid note file first')
            return
        }

        if (!recipientAddress) {
            errorToast('Invalid recipient address', 'Please enter a valid recipient address')
            return
        }

        const { secret, nullifier, nullifierHash, commitment, amountPerWithdrawal } =
            withdrawalNoteData
        setAmountPerWithdrawal(amountPerWithdrawal)
        const account = accounts.data?.find(
            (account) =>
                account.account.amountPerWithdrawal.toNumber() ===
                amountPerWithdrawal * LAMPORTS_PER_SOL
        )?.publicKey as PublicKey
        setAccount(account)

        try {
            const response = await fetch(`/api/merkleTree/${account.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            const treeData: IMerkleTree = await response.json()
            const { tree, vaultAddress } = treeData
            const poseidonHash = await createPoseidonHash()
            const deTree = MerkleTree.deserialize(tree, poseidonHash)
            const index = deTree.indexOf(commitment)
            const relayerWallet = (await getOrCreateRelayerWallet()) as string
            const fee = new BN(amountPerWithdrawal * 0.01 * LAMPORTS_PER_SOL)
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
                const { proof, publicSignals } = await generateWitnessAndProve(input)
                setProof(proof)
                setPublicSignals(publicSignals)
            } catch (err) {
                setIsGenProof(false)
            } finally {
                setIsGenProof(false)
                setIsProofValid(true)
                withdrawModalRef.current?.showModal()
            }

            if (!relayerWallet) {
                errorToast('Relayer is not available', 'Please try again later')
                return
            }

            setWithdrawalFee(fee)
            setWithdrawalNullifierHash(nullifierHash)
            setWithdrawalRoot(input.root.toString())
            setRelayerWallet(new PublicKey(relayerWallet))
            setVaultAddress(new PublicKey(vaultAddress))
        } catch (err: any) {
            setIsGenProof(false)
            if (err.message.includes('Index out of bounds: -1')) {
                errorToast('Error generating proof', 'Commitment does not exist in the merkle tree')
            } else {
                errorToast('Error generating proof', err.message)
            }
        }
    }

    const handleWithdrawal = async () => {
        try {
            setIsProofValid(false)
            await withdrawMutation?.mutateAsync({
                nullifierHash: withdrawalNullifierHash,
                root: withdrawalRoot,
                proof,
                publicSignals,
                fee: withdrawalFee,
                recipientAddress: recipientAddress as PublicKey,
                relayerWallet: relayerWallet as PublicKey,
                vaultAddress: vaultAddress as PublicKey,
            })
        } catch (err) {
            setIsProofValid(false)
        }
    }

    if (getProgramAccount.isLoading) {
        return <Spinner text="Loading mixer" overlay={true} />
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
        <div className="md:min-w-[700px] w-full absolute top-[10vh]">
            <div className="tab-header flex justify-between items-center h-12 sm:w-2/5 w-full bg-base-300 rounded-full py-2 px-2">
                <button
                    className={`w-1/2 h-10 btn btn-xs hover:bg-primary ${isActiveTabDeposit ? 'bg-primary text-white' : 'bg-base-300 border-none'}`}
                    onClick={() => setIsActiveTabDeposit(true)}
                >
                    Deposit
                </button>
                <button
                    className={`w-1/2 h-10 btn btn-xs hover:bg-primary ${!isActiveTabDeposit ? 'bg-primary text-white' : 'bg-base-300 border-none'}`}
                    onClick={() => setIsActiveTabDeposit(false)}
                >
                    Withdraw
                </button>
            </div>
            {isActiveTabDeposit && (
                <div className="text-neutral-content bg-base-100 border-2 border-base-200 rounded-[24px] my-2 py-8 px-8 tab-body text-white">
                    <div className="flex flex-col items-start gap-12">
                        {/* <div>
                            <h1 className="mb-4">Deposit Token</h1>
                            <div className="w-28 px-4 h-8 flex items-center rounded-full bg-gradient-primary">SOL</div>
                        </div> */}
                        <RangeSelector
                            amountPerWithdrawal={amountPerWithdrawal as number}
                            accounts={accounts}
                            handleAccountChange={handleAccountChange}
                        />
                        <Button
                            className="btn self-center"
                            onClick={handleDepositModal}
                            disabled={depositMutation?.isPending || !amountPerWithdrawal}
                        >
                            Make Deposit
                        </Button>
                    </div>
                    {!depositMutation.isPending && (
                        <dialog id="deposit-modal" className="modal" ref={depositModalRef}>
                            <div className="modal-box bg-base-300">
                                <div
                                    className="w-[32px] h-[32px] rounded-[50%] cursor-pointer bg-base-200 flex items-center justify-center absolute top-4 right-2"
                                    onClick={() => depositModalRef.current?.close()}
                                >
                                    <Image src={CancelBtn} alt="close modal button" />
                                </div>
                                <div className="mb-12">
                                    <h2 className="text-lg font-bold mb-8">
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
                                            className="checkbox mr-4 rounded-[0]"
                                            id="deposit-checkbox"
                                            onChange={(e) => setIsNoteSaved(e.target.checked)}
                                        />
                                        <label htmlFor="deposit-checkbox">
                                            I have backed up my note safely
                                        </label>
                                    </div>
                                    <Button
                                        className="btn-block my-4"
                                        onClick={handleDeposit}
                                        disabled={!isNoteSaved}
                                    >
                                        Send Deposit
                                    </Button>
                                </div>
                            </div>
                        </dialog>
                    )}
                </div>
            )}
            {!isActiveTabDeposit && (
                <div className="text-neutral-content bg-base-100 border-2 border-base-200 rounded-[24px] my-2 p-8 tab-body text-white">
                    {!isNoteUploaded ? (
                        <div className="flex flex-col items-center text-center gap-12">
                            <div className="flex flex-col items-start gap-2 w-full">
                                <label htmlFor="file">Select Note File</label>
                                <div
                                    className="flex flex-col items-center justify-center pt-5 pb-6 w-full border-2 border-dashed rounded-lg cursor-pointer"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('file')?.click()}
                                >
                                    <Image src={FileArrowUp} alt="drag adn drop arrow" />
                                    <p className="my-2 text-sm">
                                        drag and drop or select a note file you have backed up
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    id="file"
                                    onChange={handleWithdrawalNoteUpload}
                                    className="file-input file-input-primary w-full hidden"
                                    required
                                />
                            </div>
                            <div className="flex flex-col items-start gap-2 w-full">
                                <label htmlFor="address">Recipient Address</label>
                                <input
                                    type="text"
                                    id="address"
                                    className="input bg-base-200 w-full rounded-full h-16"
                                    onChange={handleRecipientAddressChange}
                                    autoCorrect="off"
                                    autoComplete="off"
                                    spellCheck="false"
                                    required
                                />
                            </div>
                            <Button disabled={!withdrawalNoteData || !recipientAddress}>
                                Withdraw
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center gap-12">
                            <div className="flex flex-col items-start gap-2 w-full">
                                <label>Select Note File</label>
                                <div className="flex items-center justify-between py-5 px-4 w-full rounded-full bg-base-200 h-16">
                                    <div className="flex items-center overflow-hidden">
                                        <Image
                                            src={FileArrowUp}
                                            alt="arrow up"
                                            className="w-6 sm:w-8 mr-2"
                                        />
                                        <span className="text-xs sm:text-lg">
                                            {noteFileName.slice(-15)}
                                        </span>
                                    </div>
                                    <div className="flex">
                                        <button
                                            className="btn border-[#6875A9] text-[#6875A9] mr-2 text-xs sm:text-md btn-xs sm:btn-md"
                                            onClick={() => document.getElementById('file')?.click()}
                                        >
                                            Upload another
                                        </button>
                                        <Image
                                            src={Trash}
                                            alt="trash button"
                                            className="cursor-pointer w-6 sm:w-8"
                                            onClick={handleDeleteUploadedNote}
                                        />
                                    </div>
                                </div>
                                <div className="w-full flex flex-col gap-2 mt-4 px-6">
                                    <div className="w-full flex justify-between">
                                        <span className="text-gray-400">Amount</span>
                                        <span className="font-semibold">
                                            {withdrawalNoteData?.amountPerWithdrawal} SOL
                                        </span>
                                    </div>

                                    {/* additional deposit details */}
                                    {/* <div className="w-full flex justify-between">
                                        <span className="text-gray-400">Elapsed time</span>
                                        <span className="font-semibold">{1} hour</span>
                                    </div>
                                    <div className="w-full flex justify-between">
                                        <span className="text-gray-400">Subsequent deposits</span>
                                        <span className="font-semibold">None</span>
                                    </div> */}
                                </div>
                                <input
                                    type="file"
                                    id="file"
                                    onChange={handleWithdrawalNoteUpload}
                                    className="file-input file-input-primary w-full hidden"
                                    required
                                />
                            </div>
                            <div className="flex flex-col items-start gap-2 w-full">
                                <div className="w-full relative">
                                    <div className="flex flex-col items-start gap-2 w-full mb-4">
                                        <label htmlFor="address">Recipient Address</label>
                                        <input
                                            type="text"
                                            id="address"
                                            className="input bg-base-200 rounded-full w-full h-16"
                                            onChange={handleRecipientAddressChange}
                                            autoCorrect="off"
                                            autoComplete="off"
                                            spellCheck="false"
                                            required
                                        />
                                    </div>
                                    <Image
                                        src={X}
                                        alt="x"
                                        className="absolute right-0 top-[50%] -translate-x-[50%] -translate-y-[12.5%]"
                                        onClick={handleRecipientAdrressDelete}
                                    />
                                </div>
                                {recipientAddress && (
                                    <>
                                        <div className="w-full flex justify-between px-6">
                                            <span className="text-gray-400">Fee</span>
                                            <span className="font-semibold">
                                                {(
                                                    (withdrawalNoteData?.amountPerWithdrawal as number) *
                                                    0.01
                                                ).toFixed(3)}{' '}
                                                SOL
                                            </span>
                                        </div>
                                        <div className="w-full flex justify-between px-6">
                                            <span className="text-gray-400">
                                                Recipient receives
                                            </span>
                                            <span className="font-semibold">
                                                {(
                                                    (withdrawalNoteData?.amountPerWithdrawal as number) *
                                                    0.99
                                                ).toFixed(3)}{' '}
                                                SOL
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Button
                                onClick={handleProofGen}
                                disabled={!withdrawalNoteData || !recipientAddress}
                            >
                                Withdraw
                            </Button>
                        </div>
                    )}
                    {!withdrawMutation.isPending && (
                        <dialog id="withdraw-modal" ref={withdrawModalRef} className="modal">
                            <div className="modal-box bg-base-300">
                                <div
                                    className="w-[32px] h-[32px] rounded-[50%] cursor-pointer bg-base-200 flex items-center justify-center absolute top-4 right-2"
                                    onClick={() => withdrawModalRef.current?.close()}
                                >
                                    <Image src={CancelBtn} alt="close modal button" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        Valid Withdrawal Proof
                                    </h2>
                                    <p className="my-6 text-gray-400">
                                        Your withdrawal proof has been successfully confirmed.
                                    </p>
                                </div>
                                <div className="flex flex-col items-start gap-4">
                                    <Button
                                        className="btn lg:btn-md  w-full"
                                        onClick={handleWithdrawal}
                                        disabled={!isProofValid}
                                    >
                                        Send Withdrawal
                                    </Button>
                                </div>
                            </div>
                        </dialog>
                    )}
                </div>
            )}
            {processUploadedNote && <Spinner text="Uploading note" overlay={true} />}
            {isGenProof && <Spinner text="Generating withdrawal proof" overlay={true} />}
            {withdrawMutation.isPending && <Spinner text="Sending withdrawal" overlay={true} />}
            {depositMutation.isPending && <Spinner text="Sending deposit" overlay={true} />}
        </div>
    )
}
