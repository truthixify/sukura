import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { CircuitSignals, groth16, ZKArtifact } from 'snarkjs'
import { buildPedersenHash, buildPoseidon, buildBabyjub, BigNumberish } from 'circomlibjs'
import * as crypto from 'crypto'
import { ZqField, Scalar, utils } from 'ffjavascript'
import { BN } from 'bn.js'
const { unstringifyBigInts, stringifyBigInts, leInt2Buff } = utils

interface ProofData {
    proof: any
    publicSignals: any
}
const FIELD_SIZE = new BN(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
)
const F = new ZqField(
    Scalar.fromString(
        '21888242871839275222246405745257275088548364400416034343698204186575808495617'
    )
)

export const random_bigint = (num_bytes: number) =>
    new BN(crypto.randomBytes(num_bytes)).mod(FIELD_SIZE)

export const toFixedHex = (number: number | string, length = 32) =>
    '0x' + new BN(number).toString(16).padStart(length * 2, '0')

export const pedersenHash = async (data: Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>) => {
    try {
        const babyJub = await buildBabyjub()
        const pedersen = await buildPedersenHash()

        const hash = pedersen.hash(data)
        const hP = babyJub.unpackPoint(hash)[0]
        const result = await F.fromRprLEM(hP)

        return result
    } catch (err) {
        throw err
    }
}
export const solanaAddressToBigInt = (solanaAddress: string) => {
    try {
        const bytes = bs58.decode(solanaAddress)
        const hexString = Buffer.from(bytes).toString('hex')
        return BigInt(`0x${hexString}`).toString()
    } catch (error) {
        throw new Error(`Invalid Solana address: ${error}`)
    }
}
export const hexToFixedArray = (hexStr: string): Array<number> => {
    hexStr = hexStr.toString().startsWith('0x') ? hexStr.slice(2) : hexStr

    const bytes = new Uint8Array(32).fill(0)
    const hexBytes = Buffer.from(hexStr, 'hex')

    bytes.set(hexBytes, 32 - hexBytes.length)

    return Array.from(bytes)
}

export const bigintToUint8Array = (bigInt: bigint): Uint8Array => {
    bigInt = bigInt % BigInt(FIELD_SIZE.toString())

    const buffer = new ArrayBuffer(32)
    const view = new DataView(buffer)

    for (let i = 0; i < 32; i++) {
        view.setUint8(31 - i, Number(bigInt & BigInt(0xff)))
        bigInt >>= BigInt(8)
    }

    return new Uint8Array(buffer)
}

export const uint8ArrayToBigInt = (uint8Array: Uint8Array): BigInt => {
    let hexString = Buffer.from(uint8Array).toString('hex')

    return BigInt('0x' + hexString)
}

export const generateDeposit = async () => {
    const deposit = {
        secret: random_bigint(31),
        nullifier: random_bigint(31),
        commitment: new BN(0),
        nullifierHash: new BN(0),
    }

    const preimage = Buffer.concat([
        deposit.nullifier.toArrayLike(Buffer, 'le', 32),
        deposit.secret.toArrayLike(Buffer, 'le', 32),
    ])

    try {
        const commitmentHash = await pedersenHash(preimage)
        const nullifierHash = await pedersenHash(deposit.nullifier.toArrayLike(Buffer, 'le', 32))

        deposit.commitment = commitmentHash
        deposit.nullifierHash = nullifierHash

        return deposit
    } catch (err) {
        throw err
    }
}

export const snarkVerify = async (proofData: ProofData): Promise<boolean> => {
    try {
        const vkeyResponse = await fetch('/verification_key.json')

        const vkey = await vkeyResponse.json()

        const { proof, publicSignals } = proofData

        const result = await groth16.verify(vkey, publicSignals, proof)

        return result
    } catch (err) {
        throw err
    }
}

export const generateWitnessAndProve = async (
    input: CircuitSignals
): Promise<{ proof: any; publicSignals: any }> => {
    try {
        const wR = await fetch('/sukura.wasm')
        const zR = await fetch('/sukura.zkey')

        const wB = await wR.arrayBuffer()
        const zB = await zR.arrayBuffer()

        const w = new Uint8Array(wB)
        const z = new Uint8Array(zB)

        const { proof, publicSignals } = await groth16.fullProve(input, w, z)

        return { proof, publicSignals }
    } catch (err) {
        throw err
    }
}

export const createPoseidonHash = async () => {
    const poseidon = await buildPoseidon()
    return (a: BigNumberish, b: BigNumberish) => poseidon.F.toString(poseidon([a, b]))
}

export async function fullProve(proofInputs: any, wasmPath: ZKArtifact, zkeyPath: ZKArtifact) {
    try {
        const { proof, publicSignals } = await groth16.fullProve(
            stringifyBigInts(proofInputs),
            wasmPath,
            zkeyPath
        )

        return {
            proof,
            publicSignals,
        }
    } catch (err) {
        throw err
    }
}

export function parseProofToBytesArray(proof: any, compressed = true) {
    const mydata = proof
    try {
        for (const i in mydata) {
            if (i == 'pi_a' || i == 'pi_c') {
                for (const j in mydata[i]) {
                    mydata[i][j] = Array.from(
                        leInt2Buff(unstringifyBigInts(mydata[i][j]), 32)
                    ).reverse()
                }
            } else if (i == 'pi_b') {
                for (const j in mydata[i]) {
                    for (const z in mydata[i][j]) {
                        mydata[i][j][z] = Array.from(
                            leInt2Buff(unstringifyBigInts(mydata[i][j][z]), 32)
                        )
                    }
                }
            }
        }

        if (compressed) {
            const proofA = mydata.pi_a[0]
            // negate proof by reversing the bitmask
            const proofAIsPositive = yElementIsPositiveG1(new BN(mydata.pi_a[1])) ? false : true
            proofA[0] = addBitmaskToByte(proofA[0], proofAIsPositive)
            const proofB = mydata.pi_b[0].flat().reverse()
            const proofBY = mydata.pi_b[1].flat().reverse()
            const proofBIsPositive = yElementIsPositiveG2(
                new BN(proofBY.slice(0, 32)),
                new BN(proofBY.slice(32, 64))
            )
            proofB[0] = addBitmaskToByte(proofB[0], proofBIsPositive)
            const proofC = mydata.pi_c[0]
            const proofCIsPositive = yElementIsPositiveG1(new BN(mydata.pi_c[1]))
            proofC[0] = addBitmaskToByte(proofC[0], proofCIsPositive)
            return [...proofA, ...proofB, ...proofC]
        }
        const proof = {
            proofA: [mydata.pi_a[0], mydata.pi_a[1]].flat(),
            proofB: [mydata.pi_b[0].flat().reverse(), mydata.pi_b[1].flat().reverse()].flat(),
            proofC: [mydata.pi_c[0], mydata.pi_c[1]].flat(),
        }

        return [...proof.proofA, ...proof.proofB, ...proof.proofC]
    } catch (err: any) {
        console.error('Error while parsing the proof.', err.message)
        throw err
    }
}

export function parseToBytesArray(publicSignals: { [x: string]: any }) {
    try {
        const publicInputsBytes = new Array()
        for (const i in publicSignals) {
            const ref = Array.from([
                ...leInt2Buff(unstringifyBigInts(publicSignals[i]), 32),
            ]).reverse()
            publicInputsBytes.push(ref)
        }

        return publicInputsBytes
    } catch (err: any) {
        console.error('Error while parsing public inputs.', err.message)
        throw err
    }
}

function yElementIsPositiveG1(yElement: import('bn.js')) {
    return yElement.lte(FIELD_SIZE.sub(yElement))
}

function yElementIsPositiveG2(yElement1: import('bn.js'), yElement2: import('bn.js')) {
    const fieldMidpoint = FIELD_SIZE.div(new BN(2))

    if (yElement1.lt(fieldMidpoint)) {
        return true
    } else if (yElement1.gt(fieldMidpoint)) {
        return false
    }

    return yElement2.lt(fieldMidpoint)
}

function addBitmaskToByte(byte: number, yIsPositive: boolean) {
    if (!yIsPositive) {
        return (byte |= 1 << 7)
    } else {
        return byte
    }
}

export interface NoteData {
    index: number
    secret: string
    nullifier: string
    nullifierHash: string
    amountPerWithdrawal: number
}

export const handleNoteDownload = (
    index: number,
    secret: string,
    nullifier: string,
    nullifierHash: string,
    amountPerWithdrawal: number
) => {
    const data = {
        index,
        secret,
        nullifier,
        nullifierHash,
        amountPerWithdrawal,
    }

    try {
        const jsonData = JSON.stringify(data, null, 2)

        const blob = new Blob([jsonData], { type: 'application/json' })

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sukura-${nullifierHash}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (err) {
        throw err
    }
}

export const handleNoteUpload = (file: File): Promise<NoteData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const data: NoteData = JSON.parse(reader.result as string)
                resolve({
                    index: data.index,
                    secret: data.secret,
                    nullifier: data.nullifier,
                    nullifierHash: data.nullifierHash,
                    amountPerWithdrawal: data.amountPerWithdrawal,
                })
            } catch (error) {
                console.error('Error while parsing the file.', error)
                reject(error)
            }
        }
        reader.onerror = (error) => {
            console.error('Error while reading the file.', error)
            reject(error)
        }
        reader.readAsText(file)
    })
}
