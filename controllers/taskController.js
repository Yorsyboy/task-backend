import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Task from '../model/taskModel.js'
import User from '../model/userModel.js'

// @desc: Get all task
// @route: GET /api/tasks
export const getAllTasks = asyncHandler(async (req, res) => {

    const tasks = await Task.find({})

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

    const tasks = await Task.find({ user: userId });

    if (!tasks) {
        res.status(404);
        throw new Error("No tasks found");
    }

    res.status(200).json(tasks);
});



// @desc Create a task
// @route: Post /api/tasks/new
export const createTask = asyncHandler(async (req, res) => {
    const { description } = req.body;

    if (!description) {
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
    });

    res.status(200).json(task);
});


// @desc Update a task
// @route: PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
    console.log("Request Params:", req.params);
    console.log("Request Body:", req.body);

    if (!req.params.id) {
        return res.status(400).json({ message: "Task ID is required" });
    }

    if (req.body.status === "pending" && !req.body.createdBy) {
        return res.status(400).json({ message: "CreatedBy field is required when status is pending" });
    }

    // Validate createdBy as an ObjectId
    if (req.body.status === "pending" && !mongoose.Types.ObjectId.isValid(req.body.createdBy)) {
        return res.status(400).json({ message: "Invalid User ID format" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }

    const user = await User.findById(req.body.createdBy);
    if (req.body.status === "pending" && !user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Allow the task creator to update the status to "waiting for approval"
    if (req.body.status === "waiting for approval") {
        if (task.createdBy.toString() !== req.body.createdBy.toString()) {
            return res.status(403).json({ message: "Only the task creator can request approval" });
        }
        task.status = "waiting for approval";
    }

    // Only a supervisor can approve the task
    const supervisor = await User.findById(req.body.role);
    if (!supervisor || supervisor.role !== "supervisor") {
        return res.status(403).json({ message: "Only a supervisor can approve this task 1" });
    }
    else if (req.body.status === "approved") {
        if (user.role !== "supervisor") {
            return res.status(403).json({ message: "Only a supervisor can approve this task" });
        }
        task.status = "approved";
    }

    // Invalid status update
    else {
        return res.status(400).json({ message: "Invalid status update" });
    }

    const updatedTask = await task.save(); // Use `.save()` instead of `findByIdAndUpdate`

    res.status(200).json(updatedTask);
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