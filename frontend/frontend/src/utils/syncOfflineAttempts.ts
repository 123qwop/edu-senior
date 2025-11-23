import { getUnsyncedAttempts, markAttemptsAsSynced, deleteSyncedAttempts } from './offlineStorage'
import { API_URL } from '../api/studySetsApi'

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function syncOfflineAttempts(): Promise<{ synced: number; failed: number }> {
  const unsyncedAttempts = await getUnsyncedAttempts()
  
  if (unsyncedAttempts.length === 0) {
    return { synced: 0, failed: 0 }
  }

  try {
    const response = await fetch(`${API_URL}/study-sets/attempts/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        attempts: unsyncedAttempts.map(attempt => ({
          set_id: attempt.set_id,
          question_id: attempt.question_id,
          is_correct: attempt.is_correct,
          answer: attempt.answer,
          timestamp: new Date(attempt.timestamp).toISOString(),
        })),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to sync attempts')
    }

    const syncedIds = unsyncedAttempts.map(a => a.id!).filter((id): id is number => id !== undefined)
    await markAttemptsAsSynced(syncedIds)
    await deleteSyncedAttempts()

    return { synced: unsyncedAttempts.length, failed: 0 }
  } catch (error) {
    console.error('Failed to sync offline attempts:', error)
    return { synced: 0, failed: unsyncedAttempts.length }
  }
}

