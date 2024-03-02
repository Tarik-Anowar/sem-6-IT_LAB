import express from 'express'
import { authUser, registerUser,allUsers } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/',registerUser);
router.get('/',protect,allUsers);
router.post('/login',authUser);



export default router;