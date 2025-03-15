import { Schema, Document, model, models } from 'mongoose';

interface ICommitment extends Document {
    commitment: string;
}

const CommitmentSchema = new Schema<ICommitment>(
    {
        commitment: { type: String, required: true, unique: true },
    }, 
    { timestamps: true }
);

const Commitment = models.Commitment || model<ICommitment>('Commitment', CommitmentSchema);

export default Commitment;