import Commitment from '../model'
import { connectDB } from '@/lib/mongo-db'

export async function GET(req: Request, { params }: { params: { commitment: string } }) {
    try {
        await connectDB() // Ensure DB connection

        const { commitment } = params

        if (!commitment) {
            return Response.json({ error: 'Commitment is required' }, { status: 400 })
        }

        const commitmentData = await Commitment.findOne({ commitment }).lean()

        if (!commitmentData) {
            return Response.json({ error: 'Commitment not found' }, { status: 404 })
        }

        return Response.json({ success: true, timestamp: commitmentData.createdAt  }, { status: 200 })
    } catch (err) {
        console.error('Error fetching commitment timestamp:', err)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}