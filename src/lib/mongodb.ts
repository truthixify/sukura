import { MongoClient } from 'mongodb'

const uri = process.env.MONGO_URI
if (!uri) {
    throw new Error('❌ Add MONGODB_URI to .env.local')
}

const options = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Use global variable to preserve connection in development mode
declare global {
    var _mongoClientPromise: Promise<MongoClient>
}

if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri)
        global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
} else {
    client = new MongoClient(uri)
    clientPromise = client.connect()
}

export default clientPromise
