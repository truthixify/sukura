import FixedMerkleTree from 'fixed-merkle-tree'
import MerkleTree from './model'
import { buildPoseidon } from 'circomlibjs'

const createPoseidonHash = async () => {
    const poseidon = await buildPoseidon()
    return (a: any, b: any) => poseidon.F.toString(poseidon([a, b]))
}

export async function GET(req: Request) {
    try {
        const { poolAddress } = await req.json()
        const treeData = await MerkleTree.findOne({ poolAddress }).select('-_id -__v').exec()

        if (!treeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        return Response.json({ treeData })
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}

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

        return Response.json({ treeData })
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

        const treeData = await MerkleTree.findOne({ poolAddress })

        if (!treeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        const tree = FixedMerkleTree.deserialize(treeData.tree)
        tree.insert(element)
        treeData.tree = tree
        await treeData.save()

        return Response.json({ treeData })
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}
