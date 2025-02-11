import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Task from '../model/taskModel.js'
import User from '../model/userModel.js'

// @desc: Get all task
// @route: GET /api/tasks
export const getAllTasks = asyncHandler(async (req, res) => {

    const tasks = await Task.find({}).populate("approvedBy", "name").populate("assignedTo", "name").populate("createdBy", "name");

    res.status(200).json(tasks);
})


// @desc: Get all tasks created by a user
// @route: GET /api/tasks/id
// @access: Private
export const getAllTasksByUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;

    if (!userId) {
        res.status(400);
        throw new Error("User ID is required");
    }

    const tasks = await Task.find({ user: userId }).populate("approvedBy", "name");

    if (!tasks) {
        res.status(404);
        throw new Error("No tasks found");
    }

    res.status(200).json(tasks);
});



// @desc Create a task
// @route: Post /api/tasks/new
export const createTask = asyncHandler(async (req, res) => {
    const { title, description, assignedTo, dueDate, priority, instruction } = req.body;

    if (!title || !description || !assignedTo || !dueDate || !priority) {
        res.status(400);
        throw new Error("Please fill in all fields");
    }

    // Ensure the authenticated user's ID is included in the request
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }

    // Automatically get the department from the authenticated user
    const department = req.user.department;

    if (!department) {
        res.status(400);
        throw new Error("User department is missing");
    }

    const task = await Task.create({
        description,
        department,
        createdBy: req.user._id,  // ✅ Use _id instead of name
        user: req.user._id,       // ✅ This field is redundant, consider removing
        userRole: req.user.role,
        title,
        assignedTo,
        dueDate,
        priority,
        instruction
    });

    res.status(200).json(task);
});


// @desc Update a task
// @route: PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Task ID" });
    }

    const task = await Task.findById(id);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }

    const user = req.user; // Authenticated user

    if (status === "Waiting for approval") {
        if (task.createdBy.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "Only the task creator can request approval" });
        }
        task.status = "Waiting for approval";
    }

    if (status === "Approved") {
        if (user.role !== "supervisor") {
            return res.status(403).json({ message: "Only a supervisor can approve tasks" });
        }
        task.status = "Approved";
        task.approvedBy = user._id;
        task.approvedAt = new Date();
    }

    if (!["Pending", "Waiting for approval", "Approved", "Completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status update" });
    }

    await task.save();
    res.status(200).json(task);
});




// @desc Delete a task
// @route: DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
    console.log("Task ID received:", req.params.id); // Debugging

    if (!req.params.id) {
        return res.status(400).json({ message: "Task ID is required" });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error("Task not found");
    }

    const user = await User.findById(req.user.id);
    console.log(req.user)
    console.log(req.body)

    if (!user || user.role !== "supervisor") {
        res.status(403);
        throw new Error("User not authorized to delete this task");
    }

    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Task deleted successfully", id: req.params.id });
});