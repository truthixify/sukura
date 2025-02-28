import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
    console.error('❌ No MongoDB connection string. Set MONGO_URI environment variable')
}

let isConnected = false // Prevent multiple connections

export async function connectDB() {
    if (isConnected) {
        console.log('🔥 Using existing MongoDB connection')
        return
    }

    try {
        await mongoose.connect(MONGO_URI as string, {
            dbName: 'sukura',
            bufferCommands: false,
        })

        isConnected = true
        console.log('✅ MongoDB connected')
    } catch (err) {
        throw new Error(`❌ MongoDB connection error: ${err}`)
    }
}
