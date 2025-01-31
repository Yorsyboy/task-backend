import express from 'express';
import { getAllTasks, getAllTasksByUser, createTask, deleteTask, updateTask } from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';



const router = express.Router();


router.get('/', getAllTasks);

router.get('/', getAllTasksByUser);

router.post('/new', createTask);

router.put('/:id', protect, updateTask).delete('/:id',protect, deleteTask);


module.exports = router;

