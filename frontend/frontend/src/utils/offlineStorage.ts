const DB_NAME = 'EduAppOfflineDB'
const DB_VERSION = 1

const STORES = {
  STUDY_SETS: 'studySets',
  ATTEMPTS: 'attempts',
}

interface StudySetData {
  set_id: number
  title: string
  subject?: string
  type: string
  level?: string
  description?: string
  questions: any[]
  downloaded_at: number
}

interface AttemptData {
  id?: number
  user_id: number
  set_id: number
  question_id: number
  is_correct: boolean
  answer: string
  timestamp: number
  synced: boolean
}

let db: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORES.STUDY_SETS)) {
        const studySetsStore = db.createObjectStore(STORES.STUDY_SETS, { keyPath: 'set_id' })
        studySetsStore.createIndex('downloaded_at', 'downloaded_at', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.ATTEMPTS)) {
        const attemptsStore = db.createObjectStore(STORES.ATTEMPTS, { keyPath: 'id', autoIncrement: true })
        attemptsStore.createIndex('user_id', 'user_id', { unique: false })
        attemptsStore.createIndex('set_id', 'set_id', { unique: false })
        attemptsStore.createIndex('synced', 'synced', { unique: false })
        attemptsStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

export async function downloadStudySet(studySet: any, questions: any[]): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction([STORES.STUDY_SETS], 'readwrite')
  const store = transaction.objectStore(STORES.STUDY_SETS)

  const setId = studySet.id || studySet.set_id
  const data: StudySetData = {
    set_id: setId,
    title: studySet.title,
    subject: studySet.subject || null,
    type: studySet.type,
    level: studySet.level || null,
    description: studySet.description || null,
    questions: questions || [],
    downloaded_at: Date.now(),
  }

  console.log('Saving to IndexedDB:', { set_id: setId, title: data.title, questions_count: data.questions.length })

  return new Promise((resolve, reject) => {
    const request = store.put(data)
    request.onsuccess = () => {
      console.log('Successfully saved to IndexedDB')
      resolve()
    }
    request.onerror = () => {
      console.error('IndexedDB error:', request.error)
      reject(request.error)
    }
  })
}

export async function getDownloadedStudySet(setId: number): Promise<StudySetData | null> {
  const database = await initDB()
  const transaction = database.transaction([STORES.STUDY_SETS], 'readonly')
  const store = transaction.objectStore(STORES.STUDY_SETS)

  return new Promise((resolve, reject) => {
    const request = store.get(setId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllDownloadedStudySets(): Promise<StudySetData[]> {
  const database = await initDB()
  const transaction = database.transaction([STORES.STUDY_SETS], 'readonly')
  const store = transaction.objectStore(STORES.STUDY_SETS)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function isStudySetDownloaded(setId: number): Promise<boolean> {
  try {
    const downloaded = await getDownloadedStudySet(setId)
    const result = downloaded !== null
    console.log(`Check download status for set ${setId}:`, result)
    return result
  } catch (err) {
    console.error('Error checking download status:', err)
    return false
  }
}

export async function removeDownloadedStudySet(setId: number): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction([STORES.STUDY_SETS], 'readwrite')
  const store = transaction.objectStore(STORES.STUDY_SETS)

  return new Promise((resolve, reject) => {
    const request = store.delete(setId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function saveAttempt(attempt: Omit<AttemptData, 'id' | 'synced'>): Promise<number> {
  const database = await initDB()
  const transaction = database.transaction([STORES.ATTEMPTS], 'readwrite')
  const store = transaction.objectStore(STORES.ATTEMPTS)

  const data: AttemptData = {
    ...attempt,
    synced: false,
  }

  return new Promise((resolve, reject) => {
    const request = store.add(data)
    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

export async function getUnsyncedAttempts(): Promise<AttemptData[]> {
  const database = await initDB()
  const transaction = database.transaction([STORES.ATTEMPTS], 'readonly')
  const store = transaction.objectStore(STORES.ATTEMPTS)
  const index = store.index('synced')

  return new Promise((resolve, reject) => {
    const request = index.openCursor()
    const results: AttemptData[] = []
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        if (!cursor.value.synced) {
          results.push(cursor.value)
        }
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function markAttemptsAsSynced(attemptIds: number[]): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction([STORES.ATTEMPTS], 'readwrite')
  const store = transaction.objectStore(STORES.ATTEMPTS)

  const promises = attemptIds.map((id) => {
    return new Promise<void>((resolve, reject) => {
      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const attempt = getRequest.result
        if (attempt) {
          attempt.synced = true
          const putRequest = store.put(attempt)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  })

  await Promise.all(promises)
}

export async function deleteSyncedAttempts(): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction([STORES.ATTEMPTS], 'readwrite')
  const store = transaction.objectStore(STORES.ATTEMPTS)
  const index = store.index('synced')

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(true))
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    request.onerror = () => reject(request.error)
  })
}

