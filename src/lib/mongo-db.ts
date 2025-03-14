import mongoose from 'mongoose'

/**
 * MongoDB connection URI retrieved from environment variables.
 * Ensure the `MONGO_URI` variable is set before running the application.
 */
const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
    console.error('❌ No MongoDB connection string. Set MONGO_URI environment variable')
}

declare global {
    var mongooseConnection: Promise<typeof mongoose> | undefined
}

let isConnected = false // Prevent multiple connections to MongoDB

/**
 * Establishes a connection to the MongoDB database using Mongoose.
 *
 * This function prevents redundant connections by checking the `isConnected` flag.
 * If already connected, it logs a message and returns early.
 * Otherwise, it attempts to connect using the provided `MONGO_URI`.
 *
 * @throws {Error} If the connection fails, an error is logged and thrown.
 */
export async function connectDB() {
    if (isConnected) {
        console.log('🔥 Using existing MongoDB connection')
        return
    }

    try {
        await mongoose.connect(MONGO_URI as string, {
            dbName: 'sukura', // Specifies the database name within MongoDB
            bufferCommands: false, // Disables command buffering to prevent unintended behavior
        })

        isConnected = true
        console.log('✅ MongoDB connected')
    } catch (err) {
        throw new Error(`❌ MongoDB connection error: ${err}`)
    }
}
