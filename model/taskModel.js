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
    description: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "waiting for approval", "approved", "completed"],
        default: "pending",
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
        ref: "User",
    },
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
