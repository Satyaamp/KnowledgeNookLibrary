// Minimal frontend API wrapper
const API_URL = '/api';

const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');

    const headers = {
        ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

// API Services object
const API = {
    auth: {
        login: (credentials) => apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        })
    },
    // Add other resource calls here as needed
};
