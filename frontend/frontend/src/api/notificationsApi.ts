import { redirectToLogin } from './authApi';
import { API_URL } from './studySetsApi';

function getAuthHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  category?: string | null;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
}

export async function getNotifications(limit = 50): Promise<NotificationListResponse> {
  const response = await fetch(`${API_URL}/notifications?limit=${limit}`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Failed to load notifications');
  }
  return response.json();
}

export async function getNotificationsWsTicket(): Promise<{ ticket: string; expires_in: number }> {
  const response = await fetch(`${API_URL}/notifications/ws-ticket`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    throw new Error('Failed to get WebSocket ticket');
  }
  return response.json();
}

export async function markNotificationRead(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    throw new Error('Failed to mark read');
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    throw new Error('Failed to mark all read');
  }
}

/** Build ws: URL from API http(s) base. */
export function wsUrlForApi(pathWithQuery: string): string {
  const u = new URL(API_URL);
  const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${u.host}${pathWithQuery}`;
}
