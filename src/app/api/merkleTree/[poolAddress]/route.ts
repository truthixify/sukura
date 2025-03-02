import { NextApiRequest } from 'next'
import MerkleTree from '../model'

export async function GET(req: Request, { params }: { params: { poolAddress: string } }) {
    try {
        const { poolAddress } = params
        const treeData = await MerkleTree.findOne({ poolAddress }).select('-_id -__v').exec()

        if (!treeData) {
            console.log(poolAddress)

            return Response.json({ error: 'Merkle tree not found' }, { status: 404 })
        }

        return Response.json(treeData)
    } catch (err) {
        return Response.json({ err }, { status: 500 })
    }
}
