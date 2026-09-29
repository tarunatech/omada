const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    const token = localStorage.getItem('omada_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    async get(endpoint: string) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: getHeaders(),
            });
            if (response.status === 401) {
                localStorage.removeItem('omada_token');
                localStorage.removeItem('omada_user');
                window.location.href = '/';
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || errorData?.message || `API GET error: ${response.status} ${response.statusText}`);
            }
            return response.json();
        } catch (err) {
            console.error(`Fetch error for GET ${API_BASE_URL}${endpoint}:`, err);
            throw err;
        }
    },

    async post(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (response.status === 401 && endpoint !== '/auth/login') {
            localStorage.removeItem('omada_token');
            localStorage.removeItem('omada_user');
            window.location.href = '/';
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || errorData?.message || 'API error');
        }
        return response.json();
    },

    async put(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (response.status === 401) {
            localStorage.removeItem('omada_token');
            localStorage.removeItem('omada_user');
            window.location.href = '/';
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || errorData?.message || 'API error');
        }
        return response.json();
    },

    async patch(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (response.status === 401) {
            localStorage.removeItem('omada_token');
            localStorage.removeItem('omada_user');
            window.location.href = '/';
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || errorData?.message || 'API error');
        }
        return response.json();
    },

    async delete(endpoint: string, options?: { headers?: Record<string, string>; data?: any }) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                ...getHeaders(),
                ...(options?.headers || {})
            },
            body: options?.data ? JSON.stringify(options.data) : undefined,
        });
        if (response.status === 401) {
            localStorage.removeItem('omada_token');
            localStorage.removeItem('omada_user');
            window.location.href = '/';
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || errorData?.message || 'API error');
        }
        return response.json();
    },
};
