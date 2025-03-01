import FixedMerkleTree from 'fixed-merkle-tree'
import MerkleTree from './model'
import { createPoseidonHash } from '../../../../utils/utils'

export async function POST(req: Request) {
    try {
        const { poolAddress, levels, amountPerWithdrawal, vaultAddress } = await req.json()

        if (!poolAddress) {
            return Response.json({ error: 'poolAddress is required' }, { status: 400 })
        }

        if (!levels) {
            return Response.json({ error: 'levels is required' }, { status: 400 })
        }

        if (!amountPerWithdrawal) {
            return Response.json({ error: 'amountPerWithdrawal is required' }, { status: 400 })
        }

        if (!vaultAddress) {
            return Response.json({ error: 'vaultAddress is required' }, { status: 400 })
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
    try {
        const { poolAddress, element } = await req.json()

        if (!poolAddress) {
            return Response.json({ error: 'poolAddress is required' }, { status: 400 })
        }

        if (!element) {
            return Response.json({ error: 'element is required' }, { status: 400 })
        }

        let prevTreeData = await MerkleTree.findOne({ poolAddress })

        if (!prevTreeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        const poseidonHash = await createPoseidonHash()
        const tree = FixedMerkleTree.deserialize(prevTreeData.tree, poseidonHash)
        tree.insert(element)
        const index = tree.indexOf(element)
        const newTreeData = await MerkleTree.findByIdAndUpdate(
            prevTreeData._id,
            { tree: tree.serialize() },
            { new: true }
        )
        await newTreeData.save()

        return Response.json({ index })
    } catch (err) {
        console.log(err)
        return Response.json({ err }, { status: 500 })
    }
}
