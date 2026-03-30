import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET MUST be set in production environment');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_only';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Basic validation
        if (!name || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Generate password if not provided (for employee creation by admin)
        const finalPassword = password || Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(finalPassword, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password, role, plain_password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, plain_password',
            [name, email, hashedPassword, role || 'User', finalPassword]
        );

        res.status(201).json({
            ...result.rows[0],
            generatedPassword: password ? undefined : finalPassword
        });
    } catch (err: any) {
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('[AUTH] Registration error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, plain_password as "plainPassword", selected_department as "selectedDepartment", created_at as "createdAt" FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[AUTH] Get users error:', err);
        res.status(500).json({ error: 'Server error fetching users' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting original admin if needed, but for now simple delete
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('[AUTH] Delete user error:', err);
        res.status(500).json({ error: 'Server error deleting user' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                selectedDepartment: user.selected_department
            }
        });
    } catch (err) {
        console.error('[AUTH] Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
};

export const me = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, JWT_SECRET);

        const result = await pool.query(
            'SELECT id, name, email, role, selected_department FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            selectedDepartment: user.selected_department
        });
    } catch (err) {
        console.error('[AUTH] Me endpoint error:', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
