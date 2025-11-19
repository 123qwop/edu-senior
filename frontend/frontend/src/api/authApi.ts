const API_URL = 'http://localhost:8000';

export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  role: string;
}) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { detail: `Registration failed: ${res.status} ${res.statusText}` };
      }
      throw new Error(errorData.detail || 'Registration failed');
    }

    return res.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function login(email: string, password: string) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { detail: `Login failed: ${res.status} ${res.statusText}` };
      }
      throw new Error(errorData.detail || 'Invalid credentials');
    }

    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      // Fetch and store user role after login
      try {
        const userData = await getMe();
        if (userData.role) {
          localStorage.setItem('user_role', userData.role);
        }
      } catch (err) {
        console.error('Failed to fetch user role:', err);
      }
    }
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getMe() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token found');
  }

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch user data');
  }

  const userData = await res.json();
  // Store role in localStorage
  if (userData.role) {
    localStorage.setItem('user_role', userData.role);
  }
  return userData;
}

// Utility function to get user role from localStorage
export function getUserRole(): string | null {
  return localStorage.getItem('user_role');
}

// Utility function to check if user is a teacher
export function isTeacher(): boolean {
  return getUserRole() === 'teacher';
}

// Utility function to check if user is a student
export function isStudent(): boolean {
  return getUserRole() === 'student';
}
