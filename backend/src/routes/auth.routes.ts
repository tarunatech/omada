import { Router } from 'express';
import { login, register, me, getUsers, deleteUser, updateUser, verifyCurrentPassword } from '../controllers';
import { adminAuth, auth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/me', auth, me);

// Admin-only user management
router.get('/users', adminAuth, getUsers);
router.post('/register', adminAuth, register);
router.put('/users/:id', adminAuth, updateUser);
router.post('/users/:id/verify-password', adminAuth, verifyCurrentPassword);
router.delete('/users/:id', adminAuth, deleteUser);

export default router;

