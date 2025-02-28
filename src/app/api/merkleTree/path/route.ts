import FixedMerkleTree from 'fixed-merkle-tree'
import MerkleTree from '../model'

export async function GET(req: Request) {
    try {
        const { poolAddress, index } = await req.json()
        const leafIndex = Number(index)

        if (!poolAddress) {
            return Response.json({ error: 'poolAddress is required' }, { status: 400 })
        }

        if (isNaN(leafIndex)) {
            return Response.json({ error: 'index is required' }, { status: 400 })
        }

        const treeData = await MerkleTree.findOne({ poolAddress })

        if (!treeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        const tree = FixedMerkleTree.deserialize(treeData.tree)
        const { pathElements, pathIndices } = tree.path(leafIndex)

        return Response.json({ pathElements, pathIndices })
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}
