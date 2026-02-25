export const API_URL = 'http://localhost:8000';

const defaultFetchOptions: RequestInit = {
  credentials: 'include', // send httpOnly cookies to backend
};

export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  role: string;
}) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      ...defaultFetchOptions,
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

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false
) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      ...defaultFetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: rememberMe }),
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
    // Auth is stored in httpOnly cookies; only cache role for UI (e.g. sidebar)
    if (data.access_token) {
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
  const res = await fetch(`${API_URL}/auth/me`, {
    ...defaultFetchOptions,
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch user data');
  }

  const userData = await res.json();
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

export interface UserUpdate {
  full_name?: string;
  email?: string;
  password?: string;
}

export async function updateProfile(data: UserUpdate) {
  const res = await fetch(`${API_URL}/auth/me`, {
    ...defaultFetchOptions,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      errorData = { detail: `Update failed: ${res.status} ${res.statusText}` };
    }
    throw new Error(errorData.detail || 'Failed to update profile');
  }

  const userData = await res.json();
  // Update role in localStorage if it changed
  if (userData.role) {
    localStorage.setItem('user_role', userData.role);
  }
  return userData;
}

/**
 * Permanently delete the current user's account. On success, clears local state
 * and redirects to backend logout (to clear cookies) then to login.
 */
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_URL}/auth/me`, {
    ...defaultFetchOptions,
    method: 'DELETE',
  });

  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      errorData = { detail: `Delete failed: ${res.status} ${res.statusText}` };
    }
    throw new Error(errorData.detail || 'Failed to delete account');
  }

  localStorage.removeItem('user_role');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  // Redirect to backend logout to clear cookies, then to frontend login
  window.location.href = `${API_URL}/auth/logout`;
}
