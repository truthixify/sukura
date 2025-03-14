import { connectDB } from '@/lib/mongo-db'
import MerkleTree from '../model'

export async function GET(req: Request, { params }: { params: { poolAddress: string } }) {
    try {
        await connectDB()
        
        const { poolAddress } = params
      
        const treeData = await MerkleTree.findOne({ poolAddress }).select('-_id -__v').exec()

        if (!treeData) {
            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        return Response.json(treeData)
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}
