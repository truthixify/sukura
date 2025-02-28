import MerkleTree from 'fixed-merkle-tree'
import MerkleTreeModel from '../model'

export async function GET(req: Request) {
    try {
        const { poolAddress } = await req.json()

        if (!poolAddress) {
            return Response.json({ error: 'poolAddress is required' }, { status: 400 })
        }

        const treeData = await MerkleTreeModel.findOne({ poolAddress })

        if (!treeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        const tree = MerkleTree.deserialize(treeData.tree)

        return Response.json({ root: tree.root })
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}
