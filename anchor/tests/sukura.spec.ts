import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { Sukura } from '../target/types/sukura'
import { assert } from 'chai'
import { groth16, CircuitSignals } from 'snarkjs'
import { buildPedersenHash, buildPoseidon, buildBabyjub } from 'circomlibjs'
import * as crypto from 'crypto'
import { ZqField, Scalar } from 'ffjavascript'
import * as path from 'path'
import * as fs from 'fs'
import { MerkleTree } from 'fixed-merkle-tree'
import {
    parseProofToBytesArray,
    parseToBytesArray,
} from '../../utils/generate_proof_and_public_signals'
import { BN } from 'bn.js'

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
const random_bigint = (num_bytes: number) => new BN(crypto.randomBytes(num_bytes)).mod(FIELD_SIZE)
const toFixedHex = (number: number, length = 32) =>
    '0x' + new BN(number).toString(16).padStart(length * 2, '0')
const pedersenHash = async (data: any) => {
    const babyJub = await buildBabyjub()
    const pedersen = await buildPedersenHash()

    const hash = pedersen.hash(data)
    const hP = babyJub.unpackPoint(hash)[0]
    const result = await F.fromRprLEM(hP)

    return result
}
const solanaAddressToBigInt = (solanaAddress: any) => {
    try {
        const bytes = bs58.decode(solanaAddress)
        const hexString = Buffer.from(bytes).toString('hex')
        return BigInt(`0x${hexString}`).toString()
    } catch (error) {
        throw new Error(`Invalid Solana address: ${error}`)
    }
}
const hexToFixedArray = (hexStr: string) => {
    // Remove "0x" prefix if present
    hexStr = hexStr.toString().startsWith('0x') ? hexStr.slice(2) : hexStr

    // Convert hex string to bytes
    const bytes = new Uint8Array(32).fill(0) // Pre-fill with zeros
    const hexBytes = Buffer.from(hexStr, 'hex')

    // Copy hexBytes into the rightmost part of the bytes array
    bytes.set(hexBytes, 32 - hexBytes.length)

    return Array.from(bytes)
}
const bigintToUint8Array = (bigInt: bigint): Uint8Array => {
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
const uint8ArrayToBigInt = (uint8Array: Uint8Array): BigInt => {
    // Convert Uint8Array to a hex string and then to BigInt
    let hexString = Buffer.from(uint8Array).toString('hex')

    return BigInt('0x' + hexString)
}
const generateDeposit = async () => {
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

const snarkVerify = async (proofData: ProofData): Promise<boolean> => {
    const vkeyPath = path.join(__dirname, '../circuits/build/verification_key.json')

    const vkeyBuffer = fs.readFileSync(vkeyPath, 'utf-8')

    const vkey = JSON.parse(vkeyBuffer)

    const { proof, publicSignals } = proofData

    const result = await groth16.verify(vkey, publicSignals, proof)

    return result
}

const generateWitnessAndProve = async (input: CircuitSignals): Promise<{ proof: any; publicSignals: any }> => {
    const wasmPath = path.join(__dirname, '../circuits/build/sukura_js/sukura.wasm')
    const zkeyPath = path.join(__dirname, '../circuits/build/sukura.zkey')

    const wasmBuffer = fs.readFileSync(wasmPath)
    const zkeyBuffer = fs.readFileSync(zkeyPath)

    const wasm = new Uint8Array(wasmBuffer)
    const zkey = new Uint8Array(zkeyBuffer)

    const { proof, publicSignals } = await groth16.fullProve(input, wasm, zkey)

    return { proof, publicSignals }
}

const createPoseidonHash = async () => {
    const poseidon = await buildPoseidon()
    return (a: any, b: any) => poseidon.F.toString(poseidon([a, b]))
}

describe('Sukura', () => {
    const provider = anchor.AnchorProvider.env()
    anchor.setProvider(provider)

    const program = anchor.workspace.Sukura as Program<Sukura>
    let pool = anchor.web3.Keypair.generate()
    const [vaultPda, noncePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [pool.publicKey.toBuffer()],
        program.programId
    )
    let vault = vaultPda
    let nonce = noncePda
    const authority = provider.wallet

    const amountPerWithdrawal = new BN(1_000_000) // 1 SOL
    const computeUnitsIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 500_000,
    })
    const levels = 28
    let tree: any

    beforeAll(async () => {
        const poseidonHash = await createPoseidonHash()
        tree = new MerkleTree(levels, [], { hashFunction: poseidonHash })
    })

    it('Initializes the pool', async () => {
        try {
            await program.methods
                .initializePool(levels, amountPerWithdrawal, nonce)
                .accounts({
                    pool: pool.publicKey,
                    authority: authority.publicKey,
                })
                .preInstructions([computeUnitsIx])
                .signers([pool])
                .rpc()
        } catch (err) {
            console.log(err)
        }

        const poolAccount = await program.account.sukura.fetch(pool.publicKey)
        assert.strictEqual(
            poolAccount.amountPerWithdrawal.toString(),
            amountPerWithdrawal.toString()
        )
        assert.deepStrictEqual(poolAccount.commitments, [])
        assert.deepStrictEqual(poolAccount.nullifiersHashes, [])
        assert.strictEqual(poolAccount.nonce, nonce)
        assert.strictEqual(poolAccount.merkleTree.levels, levels)
    })

    it('Deposits into the pool', async () => {
        const commitment = hexToFixedArray(toFixedHex(71))
        const eventPromise = new Promise((resolve) => {
            program.addEventListener('depositEvent', (event) => {
                // console.log('Received Deposit Event:', event)
                resolve(event)
            })
        })

        await program.methods
            .deposit(commitment)
            .accounts({
                pool: pool.publicKey,
                sender: provider.wallet.publicKey,
            })
            .preInstructions([computeUnitsIx])
            .rpc()

        const event: any = await eventPromise
        const poolAccount = await program.account.sukura.fetch(pool.publicKey)
        const vaultBalance = await provider.connection.getBalance(vault)
        assert.deepInclude(poolAccount.commitments, commitment)
        assert.strictEqual(vaultBalance, amountPerWithdrawal.toNumber())
        assert.deepEqual(event.commitment, [...commitment])
        assert.strictEqual(event.leafIndex, 0, 'Leaf index mismatch')
        assert(BN.isBN(event.timestamp), 'Timestamp should be a number')
    })

    it('Fails when depositing with a commitment that has already been used', async () => {
        const commitment = hexToFixedArray(toFixedHex(71))

        try {
            await program.methods
                .deposit(commitment)
                .accounts({
                    pool: pool.publicKey,
                    sender: provider.wallet.publicKey,
                })
                .preInstructions([computeUnitsIx])
                .rpc()
            assert.fail('Commitment already exists in the Merkle Tree')
        } catch (err: any) {
            assert.ok(err.message.includes('Commitment already exists in the Merkle Tree'))
        }
    })

    it('Snark proof verification on the client side', async () => {
        const deposit = await generateDeposit()
        tree.insert(deposit.commitment.toString())
        const { pathElements, pathIndices } = tree.path(0)

        const input: CircuitSignals = {
            root: tree.root,
            nullifierHash: deposit.nullifierHash.toString(),
            nullifier: deposit.nullifier.toString(),
            recipient: '12345',
            secret: deposit.secret.toString(),
            pathElements: pathElements.map((num: bigint) => num.toString()),
            pathIndices,
            fee: '1000',
            relayer: '123456789',
        }

        const proofData = await generateWitnessAndProve(input)
        const verification_result = await snarkVerify(proofData)
        assert(verification_result)
    })

    it('Withdrawal should be successful', async () => {
        const deposit = await generateDeposit()
        tree.insert(deposit.commitment.toString())
        const { pathElements, pathIndices } = tree.path(0)
        const commitment = bigintToUint8Array(BigInt(deposit.commitment.toString()))
        const nullifierHash = bigintToUint8Array(BigInt(deposit.nullifierHash.toString()))
        const recipient = solanaAddressToBigInt(provider.wallet.publicKey.toString())
        const input: CircuitSignals = {
            root: tree.root,
            nullifierHash: deposit.nullifierHash.toString(),
            nullifier: deposit.nullifier.toString(),
            recipient,
            secret: deposit.secret.toString(),
            pathElements,
            pathIndices,
            fee: '1000',
            relayer: '123456789',
        }
        const eventPromise = new Promise((resolve) => {
            program.addEventListener('withdrawEvent', (event) => {
                // console.log('Received Withdraw Event:', event)
                resolve(event)
            })
        })
        const poolAccount = await program.account.sukura.fetch(pool.publicKey)

        await program.methods
            .deposit(Array.from(commitment))
            .accounts({
                pool: pool.publicKey,
                sender: provider.wallet.publicKey,
            })
            .preInstructions([computeUnitsIx])
            .rpc()

        const poolAccountBeforeW = await program.account.sukura.fetch(pool.publicKey)
        const vaultBalanceBeforeW = await provider.connection.getBalance(vault)
        assert.deepInclude(poolAccountBeforeW.commitments, [...commitment])
        assert.strictEqual(vaultBalanceBeforeW, amountPerWithdrawal.toNumber())

        const proofData = await generateWitnessAndProve(input)
        assert(await snarkVerify(proofData))
        const proof = parseProofToBytesArray(proofData.proof)
        const publicSignals = parseToBytesArray(proofData.publicSignals)

        const instruction = Buffer.from([...proof, ...publicSignals.flat()])
        const root = bigintToUint8Array(BigInt(tree.root))

        await program.methods
            .withdraw([...nullifierHash], [...root], instruction)
            .accounts({
                pool: pool.publicKey,
                recipient: provider.wallet.publicKey,
            })
            .rpc()
        const event: any = await eventPromise
        const poolAccountAfterW = await program.account.sukura.fetch(pool.publicKey)
        const vaultBalanceAfterW = await provider.connection.getBalance(vault)

        assert.strictEqual(vaultBalanceAfterW, 0)
        assert.deepInclude(poolAccountAfterW.nullifiersHashes, [...nullifierHash])
        assert.deepEqual(event.nullifierHash, [...nullifierHash])
        assert.strictEqual(event.recipient.toString(), provider.wallet.publicKey.toString())
        assert.strictEqual(event.amount.toNumber(), amountPerWithdrawal.toNumber())
    })

    it('Fails when withdrawing with used nullifier', async () => {
        const deposit = await generateDeposit()
        tree.insert(deposit.commitment.toString())
        const { pathElements, pathIndices } = tree.path(0)
        const commitment = bigintToUint8Array(BigInt(deposit.commitment.toString()))
        const nullifierHash = bigintToUint8Array(BigInt(deposit.nullifierHash.toString()))
        const recipient = solanaAddressToBigInt(provider.wallet.publicKey.toString())
        const input: CircuitSignals = {
            root: tree.root,
            nullifierHash: deposit.nullifierHash.toString(),
            nullifier: deposit.nullifier.toString(),
            recipient,
            secret: deposit.secret.toString(),
            pathElements,
            pathIndices,
            fee: '1000',
            relayer: '123456789',
        }

        await program.methods
            .deposit(Array.from(commitment))
            .accounts({
                pool: pool.publicKey,
                sender: provider.wallet.publicKey,
            })
            .preInstructions([computeUnitsIx])
            .rpc()

        const poolAccountBeforeW = await program.account.sukura.fetch(pool.publicKey)
        const vaultBalanceBeforeW = await provider.connection.getBalance(vault)
        assert.deepInclude(poolAccountBeforeW.commitments, [...commitment])
        assert.strictEqual(vaultBalanceBeforeW, amountPerWithdrawal.toNumber())

        const proofData = await generateWitnessAndProve(input)
        assert(await snarkVerify(proofData))
        const proof = parseProofToBytesArray(proofData.proof)
        const publicSignals = parseToBytesArray(proofData.publicSignals)

        const instruction = Buffer.from([...proof, ...publicSignals.flat()])
        const root = bigintToUint8Array(BigInt(tree.root))

        await program.methods
            .withdraw([...nullifierHash], [...root], instruction)
            .accounts({
                pool: pool.publicKey,
                recipient: provider.wallet.publicKey,
            })
            .rpc()

        const poolAccountAfterW = await program.account.sukura.fetch(pool.publicKey)
        const vaultBalanceAfterW = await provider.connection.getBalance(vault)

        assert.strictEqual(vaultBalanceAfterW, 0)
        assert.deepInclude(poolAccountAfterW.nullifiersHashes, [...nullifierHash])

        try {
            await program.methods
                .withdraw([...nullifierHash], [...root], instruction)
                .accounts({
                    pool: pool.publicKey,
                    recipient: provider.wallet.publicKey,
                })
                .rpc()
            assert.fail('Nullifier has already been used')
        } catch (err: any) {
            assert.ok(err.message.includes('Nullifier has already been used'))
        }
    })

    it('Fails when withdrawing with invalid proof', async () => {
        const deposit = await generateDeposit()
        tree.insert(deposit.commitment.toString())
        const { pathElements, pathIndices } = tree.path(0)
        const commitment = bigintToUint8Array(BigInt(deposit.commitment.toString()))
        const nullifierHash = bigintToUint8Array(BigInt(deposit.nullifierHash.toString()))
        const recipient = solanaAddressToBigInt(provider.wallet.publicKey.toString())
        const input: CircuitSignals = {
            root: tree.root,
            nullifierHash: deposit.nullifierHash.toString(),
            nullifier: deposit.nullifier.toString(),
            recipient,
            secret: deposit.secret.toString(),
            pathElements,
            pathIndices,
            fee: '1000',
            relayer: '123456789',
        }

        await program.methods
            .deposit(Array.from(commitment))
            .accounts({
                pool: pool.publicKey,
                sender: provider.wallet.publicKey,
            })
            .preInstructions([computeUnitsIx])
            .rpc()

        const proofData = await generateWitnessAndProve(input)
        assert(await snarkVerify(proofData))
        const proof = parseProofToBytesArray(proofData.proof)
        let publicSignals = parseToBytesArray(proofData.publicSignals)
        publicSignals[0][0] += 1

        const instruction = Buffer.from([...proof, ...publicSignals.flat()])
        const root = bigintToUint8Array(BigInt(tree.root))

        try {
            await program.methods
                .withdraw([...nullifierHash], [...root], instruction)
                .accounts({
                    pool: pool.publicKey,
                    recipient: provider.wallet.publicKey,
                })
                .rpc()
            assert.fail('Invalid proof provided for withdrawal"')
        } catch (err: any) {
            assert.ok(err.message.includes('Invalid proof provided for withdrawal'))
        }
    })

    afterEach(async () => {
        const poseidonHash = await createPoseidonHash()
        tree = new MerkleTree(levels, [], { hashFunction: poseidonHash })
        pool = anchor.web3.Keypair.generate()
        const [vaultPda, noncePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [pool.publicKey.toBuffer()],
            program.programId
        )
        vault = vaultPda
        nonce = noncePda

        await program.methods
            .initializePool(levels, amountPerWithdrawal, nonce)
            .accounts({
                pool: pool.publicKey,
                authority: authority.publicKey,
            })
            .signers([pool])
            .preInstructions([computeUnitsIx])
            .rpc()
    })
})
