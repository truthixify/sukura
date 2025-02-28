import MerkleTree from 'fixed-merkle-tree'
import MerkleTreeModel from './model'
import { buildPoseidon } from 'circomlibjs'

const createPoseidonHash = async () => {
    const poseidon = await buildPoseidon()
    return (a: any, b: any) => poseidon.F.toString(poseidon([a, b]))
}

export async function POST(req: Request) {
    try {
        const { poolAddress, levels } = await req.json()

        if (!poolAddress) {
            return Response.json({ error: 'poolAddress is required' }, { status: 400 })
        }

        if (!levels) {
            return Response.json({ error: 'levels is required' }, { status: 400 })
        }

        const poseidonHash = await createPoseidonHash()
        const tree = new MerkleTree(levels, [], { hashFunction: poseidonHash })
        const merkleTree = new MerkleTreeModel({
            poolAddress,
            tree: tree.serialize(),
        })
        await merkleTree.save()
        return Response.json({ merkleTree })
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

        const treeData = await MerkleTreeModel.findOne({ poolAddress })

        if (!treeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        const tree = MerkleTree.deserialize(treeData.tree)
        tree.insert(element)
        treeData.tree = tree.serialize()
        await treeData.save()
        return Response.json({ treeData })
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}
