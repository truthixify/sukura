import FixedMerkleTree from 'fixed-merkle-tree'
import MerkleTree from './model'
import { createPoseidonHash } from '../../../utils/utils'
import { connectDB } from '@/utils/mongo-db'
import mongoose from 'mongoose'
import { confirmTransaction } from '@/utils/tx-confirmation-retry'
import { Connection } from '@solana/web3.js'

connectDB().catch((err) => console.log(err))

export async function POST(req: Request) {
    try {
        const { poolAddress, levels, amountPerWithdrawal, vaultAddress } = await req.json()

        if (!poolAddress) {
            return Response.json({ error: 'Pool address is required' }, { status: 400 })
        }

        if (!levels) {
            return Response.json({ error: 'Levels is required' }, { status: 400 })
        }

        if (!amountPerWithdrawal) {
            return Response.json({ error: 'Pool amount is required' }, { status: 400 })
        }

        if (!vaultAddress) {
            return Response.json({ error: 'Vault address is required' }, { status: 400 })
        }

        const poseidonHash = await createPoseidonHash()
        const tree = new FixedMerkleTree(levels, [], { hashFunction: poseidonHash })
        const treeData = new MerkleTree({
            poolAddress,
            tree: tree.serialize(),
            amountPerWithdrawal,
            vaultAddress,
        })
        await treeData.save()

        return Response.json(treeData)
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const { poolAddress, commitment, signature } = await req.json()

        if (!poolAddress) {
            return Response.json({ error: 'Pool address is required' }, { status: 400 })
        }

        if (!commitment) {
            return Response.json({ error: 'Commitment is required' }, { status: 400 })
        }

        let prevTreeData = await MerkleTree.findOne({ poolAddress })

        if (!prevTreeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        const poseidonHash = await createPoseidonHash()
        const tree = FixedMerkleTree.deserialize(prevTreeData.tree, poseidonHash)
        tree.insert(commitment)
        const newTreeData = await MerkleTree.findByIdAndUpdate(
            prevTreeData._id,
            { tree: tree.serialize() },
            { new: true }
        )
        await newTreeData.save()

        const connection = new Connection(process.env.NETWORK_URL as string)
        await confirmTransaction(connection, signature)

        await session.commitTransaction()
        session.endSession()

        return Response.json({ success: true })
    } catch (err) {
        console.error('Transaction Failed:', err)
        await session.abortTransaction()
        session.endSession()
        return Response.json({ error: 'Transaction failed, rollback triggered' }, { status: 500 })
    }
}
