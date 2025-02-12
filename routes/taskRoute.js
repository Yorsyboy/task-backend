import express from 'express';
import { getAllTasks, getAllTasksByUser, createTask, deleteTask, updateTask } from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';



const router = express.Router();

// Set up Multer for file uploads
const storage = multer.diskStorage({});
const upload = multer({ storage });
  

router.get('/', getAllTasks);

router.get('/', getAllTasksByUser);

router.post('/new',protect, upload.array("documents"), createTask);

router.put('/:id', protect, updateTask).delete('/:id',protect, deleteTask);



module.exports = router;

