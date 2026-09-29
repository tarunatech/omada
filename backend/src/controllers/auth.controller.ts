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

export const verifyCurrentPassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { currentPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ valid: false, error: 'Current password is required' });
        }

        const userRes = await pool.query('SELECT password, plain_password FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ valid: false, error: 'User not found' });
        }

        const user = userRes.rows[0];
        let isMatch = false;
        try {
            if (user.password) {
                isMatch = await bcrypt.compare(currentPassword, user.password);
            }
        } catch (e) {
            isMatch = false;
        }

        if (!isMatch && (user.password === currentPassword || user.plain_password === currentPassword)) {
            isMatch = true;
        }

        if (!isMatch) {
            return res.status(400).json({ valid: false, error: 'Current password does not match' });
        }

        return res.json({ valid: true, message: 'Current password verified successfully' });
    } catch (err) {
        console.error('[AUTH] Verify password error:', err);
        res.status(500).json({ error: 'Server error verifying password' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, role, currentPassword, newPassword } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if user exists
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];

        // Check email uniqueness if email is changed
        const existingEmail = await pool.query(
            'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND id != $2',
            [email, id]
        );
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered for another employee' });
        }

        // If new password is provided, verify current password first
        if (newPassword && typeof newPassword === 'string' && newPassword.trim() !== '') {
            if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim() === '') {
                return res.status(400).json({ error: 'Current password is required to change password' });
            }

            let isMatch = false;
            try {
                if (user.password) {
                    isMatch = await bcrypt.compare(currentPassword, user.password);
                }
            } catch (e) {
                isMatch = false;
            }

            // Fallback for legacy plain text entries
            if (!isMatch && (user.password === currentPassword || user.plain_password === currentPassword)) {
                isMatch = true;
            }

            if (!isMatch) {
                return res.status(400).json({ error: 'Current password verification failed. Please enter the correct current password.' });
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword.trim(), 10);
            const plainPassword = newPassword.trim();

            const result = await pool.query(
                `UPDATE users 
                 SET name = $1, email = $2, role = $3, password = $4, plain_password = $5 
                 WHERE id = $6 
                 RETURNING id, name, email, role, plain_password as "plainPassword", selected_department as "selectedDepartment", created_at as "createdAt"`,
                [name.trim().toUpperCase(), email.trim().toLowerCase(), role || user.role, hashedNewPassword, plainPassword, id]
            );

            return res.json({
                message: 'Employee details and password updated successfully',
                user: result.rows[0]
            });
        } else {
            // Update details without password modification
            const result = await pool.query(
                `UPDATE users 
                 SET name = $1, email = $2, role = $3 
                 WHERE id = $4 
                 RETURNING id, name, email, role, plain_password as "plainPassword", selected_department as "selectedDepartment", created_at as "createdAt"`,
                [name.trim().toUpperCase(), email.trim().toLowerCase(), role || user.role, id]
            );

            return res.json({
                message: 'Employee details updated successfully',
                user: result.rows[0]
            });
        }
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('[AUTH] Update user error:', err);
        res.status(500).json({ error: 'Server error updating employee details' });
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
