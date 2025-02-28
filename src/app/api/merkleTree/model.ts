import { SerializedTreeState } from 'fixed-merkle-tree'
import { Schema, Document, model, models } from 'mongoose'

export interface IMerkleTree extends Document {
    tree: SerializedTreeState
    poolAddress: string
    vaultAddress: string
    amountPerWithdrawal: number
}

const MerkleTreeSchema: Schema = new Schema({
    tree: {
        type: Schema.Types.Mixed,
        required: true,
    },
    poolAddress: {
        type: String,
        required: true,
    },
    vaultAddress: {
        type: String,
        required: true,
    },
    amountPerWithdrawal: {
        type: Number,
        required: true,
    },
})

const MerkleTree = models.MerkleTree || model<IMerkleTree>('MerkleTree', MerkleTreeSchema)

export default MerkleTree
