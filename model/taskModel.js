import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    description: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'waiting for approval', 'approved', 'completed'], // ✅ Added 'approved' for clarity
        default: 'pending',
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

export default mongoose.model('Task', taskSchema);
