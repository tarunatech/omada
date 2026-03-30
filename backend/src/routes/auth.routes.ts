import { Router } from 'express';
import { login, register, me, getUsers, deleteUser } from '../controllers';
import { adminAuth, auth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/me', auth, me);

// Admin-only user management
router.get('/users', adminAuth, getUsers);
router.post('/register', adminAuth, register);
router.delete('/users/:id', adminAuth, deleteUser);

export default router;
