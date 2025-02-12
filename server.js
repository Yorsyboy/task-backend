const port = process.env.PORT || 5000;
import express from 'express';
import cors from 'cors';
import colors from 'colors';
import dotenv from 'dotenv';
import errorHandler from './middleware/errorMiddleware.js';
import connectDB from './config/db.js';
import {
  getAllTasks,
  getAllTasksByUser
  , createTask,
  updateTask,
  deleteTask
} from './controllers/taskController.js';
import { protect } from './middleware/authMiddleware.js';
import { createUser, getUsers, loginUser } from './controllers/userController.js';
import multer from 'multer';


connectDB();

const app = express();

app.use(cors());

dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up file storage

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/tasks/new', protect, upload.array("documents", 5), createTask);
app.get('/api/tasks', getAllTasks);
app.get('/api/tasks/user/:id', protect, getAllTasksByUser);
app.put('/api/tasks/:id', protect, updateTask);
app.delete('/api/tasks/:id', protect, deleteTask);
app.post('/api/users', createUser);
app.post('/api/users/login', loginUser);
app.get('/api/users', getUsers);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});