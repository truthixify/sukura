import { SerializedTreeState } from 'fixed-merkle-tree'
import { Schema, Document, model } from 'mongoose'

export interface IMerkleTree extends Document {
    tree: SerializedTreeState
    poolAddress: string
}

const MerkleTreeSchema: Schema = new Schema({
    tree: { type: Object, required: true },
    poolAddress: { type: String, required: true },
})

export default model<IMerkleTree>('MerkleTree', MerkleTreeSchema)
