import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Task from '../model/taskModel.js'
import User from '../model/userModel.js'
import drive from "../config/googleDrive.js";
import multer from "multer";
import { Readable } from "stream"
import nodemailer from "nodemailer";
import fs from "fs"
import { v4 as uuidv4 } from "uuid";

const upload = multer({ storage: multer.memoryStorage() });

// Configure Nodemailer with IMAP SMTP settings
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // SSL: true for port 465, false for 587
    auth: {
        user: process.env.EMAIL_USER, // Ensure it's not empty
        pass: process.env.EMAIL_PASS, // Ensure it's not empty
    },
});


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

    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }

    const department = req.user.department;
    if (!department) {
        res.status(400);
        throw new Error("User department is missing");
    }

    const uploadedFiles = [];

    for (const file of req.files) {
        const uniqueFileName = `${uuidv4()}-${file.originalname}`;

        const fileMetadata = {
            name: uniqueFileName,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // Google Drive folder ID
        };

        // Convert buffer to readable stream
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        const media = {
            mimeType: file.mimetype,
            body: bufferStream, // Use buffer stream instead of raw buffer
        };

        try {
            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: "id, webViewLink, webContentLink",
            });

            const fileId = response.data.id;

            // Set file permissions to be publicly accessible
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: "reader",
                    type: "anyone",
                },
            });

            uploadedFiles.push({
                id: response.data.id,
                url: response.data.webViewLink,
            });
        } catch (error) {
            console.error("Google Drive Upload Error:", error);
            return res.status(500).json({ message: "Error uploading file" });
        }
    }

    try {
        // Save task with uploaded file URLs
        const task = await Task.create({
            title,
            description,
            department,
            createdBy: req.user._id,
            userRole: req.user.role,
            assignedTo,
            dueDate,
            priority,
            instruction,
            documents: uploadedFiles,
        });

        // Find the assigned user's email
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            return res.status(404).json({ message: "Assigned user not found" });
        }

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: assignedUser.email, // User's email
            subject: `New Task Assigned: ${title}`,
            html: `
                <p>Hello ${assignedUser.name},</p>
                <p>You have been assigned a new task:</p>
                <ul>
                    <li><strong>Title:</strong> ${title}</li>
                    <li><strong>Description:</strong> ${description}</li>
                    <li><strong>Due Date:</strong> ${dueDate}</li>
                    <li><strong>Priority:</strong> ${priority}</li>
                </ul>
                <p>Please log in to your account to check the full details.</p>
                <p>Best Regards,<br/>Task Management Team</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json(task);
    } catch (error) {
        console.error("Task Creation Error:", error);
        console.log("SMTP Host:", process.env.SMTP_HOST);
        console.log("SMTP User:", process.env.EMAIL_USER ? "Loaded" : "MISSING");
        console.log("SMTP Pass:", process.env.EMAIL_PASS ? "Loaded" : "MISSING");
        res.status(500).json({ message: "Error creating task" });
    }

});


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
        if (task.createdBy.toString() !== user._id.toString() &&
            task.assignedTo.toString() !== user._id.toString()) {
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

    if (!req.params.id) {
        return res.status(400).json({ message: "Task ID is required" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user || (user.role !== "supervisor" && user._id.toString() !== task.createdBy.toString())) {
        return res.status(403).json({ message: "User not authorized to delete this task" });
    }


    // ✅ Delete files from Google Drive before removing the task
    if (task.documents && task.documents.length > 0) {
        await Promise.all(
            task.documents.map(async (file) => {
                if (file.id) {  // Ensure file has a Google Drive ID
                    try {
                        console.log("Deleting file from Google Drive:", file.id);
                        await drive.files.delete({ fileId: file.id });
                        console.log("Google Drive delete successful:", file.id);
                    } catch (error) {
                        console.error("Google Drive delete error:", error.message);
                    }
                }
            })
        );
    } else {
        console.log("No documents found for this task.");
    }

    // ✅ Delete task from database
    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Task deleted successfully", id: req.params.id });
});
