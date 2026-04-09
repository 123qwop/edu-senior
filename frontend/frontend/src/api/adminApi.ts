import { API_URL, redirectToLogin } from './authApi';

function getHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string | null;
}

export interface AdminStudySet {
  id: number;
  title: string;
  subject: string | null;
  type: string;
  creator_id: number;
  creator_name: string;
  creator_email: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/admin/users`, {
    credentials: 'include',
    headers: getHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to load users');
  }
  return res.json();
}

export async function patchAdminUserRole(userId: number, role: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to update role');
  }
  return res.json();
}

export async function deleteAdminUser(userId: number): Promise<void> {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to delete user');
  }
}

export async function getAdminStudySets(): Promise<AdminStudySet[]> {
  const res = await fetch(`${API_URL}/admin/studysets`, {
    credentials: 'include',
    headers: getHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to load study sets');
  }
  return res.json();
}

export async function deleteAdminStudySet(setId: number): Promise<void> {
  const res = await fetch(`${API_URL}/admin/studysets/${setId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to delete study set');
  }
}
