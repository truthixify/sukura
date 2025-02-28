import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { CircuitSignals, groth16, ZKArtifact } from 'snarkjs'
import { buildPedersenHash, buildPoseidon, buildBabyjub, BigNumberish } from 'circomlibjs'
import * as crypto from 'crypto'
import { ZqField, Scalar, utils } from 'ffjavascript'
// import * as path from 'path'
// import * as fs from 'fs'
import { BN } from 'bn.js'
const unstringifyBigInts = utils.unstringifyBigInts
const stringifyBigInts = utils.stringifyBigInts
const leInt2Buff = utils.leInt2Buff

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

// useful utility functions
export const random_bigint = (num_bytes: number) =>
    new BN(crypto.randomBytes(num_bytes)).mod(FIELD_SIZE)
export const toFixedHex = (number: number | string, length = 32) =>
    '0x' + new BN(number).toString(16).padStart(length * 2, '0')
export const pedersenHash = async (data: Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>) => {
    const babyJub = await buildBabyjub()
    const pedersen = await buildPedersenHash()

    const hash = pedersen.hash(data)
    const hP = babyJub.unpackPoint(hash)[0]
    const result = await F.fromRprLEM(hP)

    return result
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
    // Remove "0x" prefix if present
    hexStr = hexStr.toString().startsWith('0x') ? hexStr.slice(2) : hexStr

    // Convert hex string to bytes
    const bytes = new Uint8Array(32).fill(0) // Pre-fill with zeros
    const hexBytes = Buffer.from(hexStr, 'hex')

    // Copy hexBytes into the rightmost part of the bytes array
    bytes.set(hexBytes, 32 - hexBytes.length)

    return Array.from(bytes)
}
export const bigintToUint8Array = (bigInt: bigint): Uint8Array => {
    // Take the modulus of bigInt with respect to the field size
    bigInt = bigInt % BigInt(FIELD_SIZE.toString())

    // Create a buffer large enough to hold 32 bytes (256 bits)
    const buffer = new ArrayBuffer(32)
    const view = new DataView(buffer)

    // Write the BigInt into the buffer as bytes
    for (let i = 0; i < 32; i++) {
        view.setUint8(31 - i, Number(bigInt & BigInt(0xff))) // Mask to get the last byte and set it
        bigInt >>= BigInt(8) // Shift BigInt by 8 bits (1 byte) to process the next byte
    }

    return new Uint8Array(buffer)
}
export const uint8ArrayToBigInt = (uint8Array: Uint8Array): BigInt => {
    // Convert Uint8Array to a hex string and then to BigInt
    let hexString = Buffer.from(uint8Array).toString('hex')

    return BigInt('0x' + hexString)
}
export const generateDeposit = async () => {
    let deposit = {
        secret: random_bigint(31),
        nullifier: random_bigint(31),
        commitment: uint8ArrayToBigInt(new Uint8Array(32)),
        nullifierHash: uint8ArrayToBigInt(new Uint8Array(32)),
    }

    const preimage = Buffer.concat([
        deposit.nullifier.toArrayLike(Buffer, 'le', 32),
        deposit.secret.toArrayLike(Buffer, 'le', 32),
    ])
    const commitmentHash = await pedersenHash(preimage)
    const nullifierHash = await pedersenHash(deposit.nullifier.toArrayLike(Buffer, 'le', 32))

    deposit.commitment = commitmentHash
    deposit.nullifierHash = nullifierHash

    return deposit
}

export const snarkVerify = async (proofData: ProofData): Promise<boolean> => {
    const vkeyResponse = await fetch('/verification_key.json')

    const vkey = await vkeyResponse.json()

    const { proof, publicSignals } = proofData

    const result = await groth16.verify(vkey, publicSignals, proof)

    return result
}

export const generateWitnessAndProve = async (
    input: CircuitSignals
): Promise<{ proof: any; publicSignals: any }> => {
    const wR = await fetch('/sukura.wasm')
    const zR = await fetch('/sukura.zkey')

    const wB = await wR.arrayBuffer()
    const zB = await zR.arrayBuffer()

    const w = new Uint8Array(wB)
    const z = new Uint8Array(zB)

    const { proof, publicSignals } = await groth16.fullProve(input, w, z)

    return { proof, publicSignals }
}

export const createPoseidonHash = async () => {
    const poseidon = await buildPoseidon()
    return (a: BigNumberish, b: BigNumberish) => poseidon.F.toString(poseidon([a, b]))
}

// generate proofs and public signals
export async function fullProve(proofInputs: any, wasmPath: ZKArtifact, zkeyPath: ZKArtifact) {
    const { proof, publicSignals } = await groth16.fullProve(
        stringifyBigInts(proofInputs),
        wasmPath,
        zkeyPath
    )

    return {
        proof,
        publicSignals,
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
    } catch (error: any) {
        console.error('Error while parsing the proof.', error.message)
        throw error
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
    } catch (error: any) {
        console.error('Error while parsing public inputs.', error.message)
        throw error
    }
}

function yElementIsPositiveG1(yElement: import('bn.js')) {
    return yElement.lte(FIELD_SIZE.sub(yElement))
}

function yElementIsPositiveG2(yElement1: import('bn.js'), yElement2: import('bn.js')) {
    const fieldMidpoint = FIELD_SIZE.div(new BN(2))

    // Compare the first component of the y coordinate
    if (yElement1.lt(fieldMidpoint)) {
        return true
    } else if (yElement1.gt(fieldMidpoint)) {
        return false
    }

    // If the first component is equal to the midpoint, compare the second component
    return yElement2.lt(fieldMidpoint)
}

function addBitmaskToByte(byte: number, yIsPositive: boolean) {
    if (!yIsPositive) {
        return (byte |= 1 << 7)
    } else {
        return byte
    }
}
