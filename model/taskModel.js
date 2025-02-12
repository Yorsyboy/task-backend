import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    userRole: {
        type: String,
        enum: ["supervisor", "user"],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["Pending", "Waiting for approval", "Approved"],
        default: "Pending",
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    dueDate: {
        type: Date,
        required: true,
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        required: true,
    },
    instruction: {
        type: String,
    },
    progress: {
        type: Number,
        default: 0,
    },
    documents: [{ public_id: String, url: String }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
});

taskSchema.virtual("createdByName", {
    ref: "User",
    localField: "createdBy",
    foreignField: "_id",
    justOne: true,
    options: { select: "name" },
});

taskSchema.virtual("assignedToName", {
    ref: "User",
    localField: "assignedTo",
    foreignField: "_id",
    justOne: true,
    options: { select: "name" },
});

// Automatically set userRole before saving the task
taskSchema.pre("save", async function (next) {
    if (!this.isModified("createdBy")) return next();

    const user = await mongoose.model("User").findById(this.createdBy);
    if (user) {
        this.userRole = user.role;
    } else {
        return next(new Error("User not found"));
    }

    next();
});

// Ensure `approvedBy` returns the full user name
taskSchema.set("toObject", { virtuals: true });
taskSchema.set("toJSON", { virtuals: true });

taskSchema.virtual("approvedByName", {
    ref: "User",
    localField: "approvedBy",
    foreignField: "_id",
    justOne: true,
    options: { select: "name" },
});

export default mongoose.model("Task", taskSchema);
