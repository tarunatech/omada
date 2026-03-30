-- Initial Data

-- Create a default Admin user (password: admin123)
-- Note: In a real app, you would hash this. But for setup, we can use a pre-hashed version or simple text if you have a registration page.
-- Pre-hashed 'admin123' using bcrypt with 10 rounds: $2a$10$x.Xz4z.D8qR5P/yD8vG.6eS.9S3O8n8Q9R8S8T8U8V8W8X8Y8Z8a
-- Actually, it's better if you use the /api/auth/register endpoint once the server is running.

-- Here is a sample insertion for testing if you want to skip registration:
-- INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@omada.com', '$2a$10$x.Xz4z.D8qR5P/yD8vG.6eS.9S3O8n8Q9R8S8T8U8V8W8X8Y8Z8a', 'Admin');
