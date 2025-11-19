const API_URL = 'http://localhost:8000';

export interface StudySetCreate {
  title: string;
  subject: string;
  type: 'Flashcards' | 'Quiz' | 'Problem set';
  level?: string;
  description?: string;
  tags?: string[];
  initialItem?: {
    term?: string;
    definition?: string;
    question?: string;
    questionType?: 'Multiple choice' | 'True/False' | 'Short answer';
    options?: string[];
    correctAnswer?: number | boolean | string;
    problem?: string;
    solution?: string;
  };
  assignment?: {
    classId?: number;
    assignToAll?: boolean;
    studentIds?: number[];
    dueDate?: string;
  };
}

export interface StudySetOut {
  id: number;
  title: string;
  subject: string | null;
  type: string;
  level: string | null;
  description: string | null;
  creator_id: number;
  created_at: string;
  updated_at: string;
  item_count: number;
  tags: string[];
  is_assigned: boolean;
  is_downloaded: boolean;
  mastery: number | null;
}

export interface QuestionCreate {
  type: string;
  content: string;
  correct_answer: string;
  options?: string[];
  term?: string;
  definition?: string;
  problem?: string;
  solution?: string;
}

export interface QuestionOut {
  id: number;
  set_id: number;
  type: string;
  content: string;
  correct_answer: string;
  options?: string[] | null;
  term?: string | null;
  definition?: string | null;
}

export interface ClassOut {
  id: number;
  class_name: string;
  teacher_id: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token found');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: `Request failed: ${response.status} ${response.statusText}` };
    }
    throw new Error(errorData.detail || 'Request failed');
  }
  return response.json();
}

// Get study sets with filters
export async function getStudySets(params?: {
  search?: string;
  subject?: string;
  type?: string;
  ownership?: string;
  sort?: string;
}): Promise<StudySetOut[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.subject) queryParams.append('subject', params.subject);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.ownership) queryParams.append('ownership', params.ownership);
    if (params?.sort) queryParams.append('sort', params.sort);

    const url = `${API_URL}/study-sets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<StudySetOut[]>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Create study set
export async function createStudySet(data: StudySetCreate): Promise<StudySetOut> {
  try {
    const response = await fetch(`${API_URL}/study-sets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<StudySetOut>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Get single study set
export async function getStudySet(setId: number): Promise<StudySetOut> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<StudySetOut>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Get classes (for assignment dropdown)
export async function getClasses(): Promise<ClassOut[]> {
  try {
    const response = await fetch(`${API_URL}/classes`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<ClassOut[]>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Mark study set as offline/downloaded
export async function markStudySetOffline(setId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/offline`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: `Request failed: ${response.status} ${response.statusText}` };
      }
      throw new Error(errorData.detail || 'Failed to mark study set as offline');
    }
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Remove study set from offline
export async function removeStudySetOffline(setId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/offline`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: `Request failed: ${response.status} ${response.statusText}` };
      }
      throw new Error(errorData.detail || 'Failed to remove study set from offline');
    }
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

