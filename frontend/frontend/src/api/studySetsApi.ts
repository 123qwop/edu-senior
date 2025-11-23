export const API_URL = 'http://localhost:8000';

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
  subject: string | null;
  level: string | null;
  description?: string | null;
  student_count: number;
  assignment_count: number;
  average_mastery: number | null;
}

export interface ClassCreate {
  class_name: string;
  subject: string;
  level?: string;
  description?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
    const response = await fetch(`${API_URL}/study-sets/classes`, {
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

// Create a new class
export async function createClass(data: ClassCreate): Promise<ClassOut> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<ClassOut>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface Student {
  id: number;
  name: string;
  email: string;
}

export interface StudentProgressDetail {
  student_id: number;
  student_name: string;
  student_email: string;
  assignments_completed: number;
  assignments_total: number;
  average_mastery: number;
  assignments: Array<{
    assignment_id: number;
    set_id: number;
    title: string;
    mastery: number;
    items_completed: number;
    total_items: number;
    is_completed: boolean;
    last_activity: string | null;
  }>;
}

export interface AddStudentsResponse {
  added: number[];
  errors: string[];
  message: string;
}

// Get students enrolled in a class
export async function getClassStudents(classId: number): Promise<Student[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}/students`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<Student[]>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Search users by name or email
export async function searchUsers(query: string): Promise<Student[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/users/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<Student[]>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Add students to a class
export async function addStudentsToClass(classId: number, studentIds: number[]): Promise<AddStudentsResponse> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}/students`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ student_ids: studentIds }),
    });

    return handleResponse<AddStudentsResponse>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Remove a student from a class
export async function removeStudentFromClass(classId: number, studentId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}/students/${studentId}`, {
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
      throw new Error(errorData.detail || 'Failed to remove student');
    }
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface ClassUpdate {
  class_name?: string;
  subject?: string;
  level?: string;
  description?: string;
}

// Update a class
export async function updateClass(classId: number, data: ClassUpdate): Promise<ClassOut> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<ClassOut>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Delete a class
export async function deleteClass(classId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to delete class');
    }
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface CreateAssignmentRequest {
  set_id: number;
  due_date?: string;
}

// Create an assignment (assign study set to class)
export async function createAssignment(classId: number, data: CreateAssignmentRequest): Promise<{ message: string; assignment_id: number }> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}/assignments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<{ message: string; assignment_id: number }>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface Assignment {
  assignment_id: number;
  set_id: number;
  due_date: string | null;
  assigned_by: number;
  title: string;
  subject: string | null;
  type: string;
  level: string | null;
  description: string | null;
}

// Get student progress for a class (teachers only)
export async function getClassStudentsProgress(classId: number): Promise<StudentProgressDetail[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}/students/progress`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<StudentProgressDetail[]>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Get assignments for a class
export async function getClassAssignments(classId: number): Promise<Assignment[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}/assignments`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<Assignment[]>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface StudySetUpdate {
  title?: string;
  subject?: string;
  type?: string;
  level?: string;
  description?: string;
  tags?: string[];
  is_shared?: boolean;
  is_public?: boolean;
}

// Update a study set
export async function updateStudySet(setId: number, data: StudySetUpdate): Promise<StudySetOut> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}`, {
      method: 'PUT',
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

export interface DashboardStats {
  questions_answered?: number;
  accuracy?: number;
  time_spent?: number;
  active_students?: number;
  assignments_submitted?: number;
  classes_active?: number;
}

export interface DashboardAssignment {
  id: number;
  title: string;
  due: string | null;
  status: string;
  set_id: number;
}

export interface Recommendation {
  topic: string;
  reason: string;
  difficulty: string;
  set_id: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  current_user_rank: LeaderboardEntry | null;
}

export interface Badge {
  name: string;
  icon: string;
}

export interface NextBadge {
  name: string;
  progress: number;
  target: number;
}

export interface StreaksResponse {
  streak: number;
  badges: Badge[];
  next_badge: NextBadge | null;
}

export interface StudentAnalyticsDetail {
  student_id: number;
  student_name: string;
  student_email: string;
  mastery: number;
  items_completed: number;
  total_items: number;
  is_completed: boolean;
  last_activity: string | null;
}

export interface StudySetAnalytics {
  set_id: number;
  title: string;
  total_students: number;
  average_mastery: number;
  completion_rate: number;
  total_attempts: number;
  students: StudentAnalyticsDetail[];
}

export interface AnalyticsResponse {
  study_sets: StudySetAnalytics[];
  total_students: number;
  average_mastery: number;
  total_assignments: number;
}

export interface StudentProgress {
  set_id: number;
  title: string;
  subject?: string;
  mastery_percentage: number;
  items_completed: number;
  total_items: number;
  last_activity?: string;
  attempts: number;
}

export interface ProgressResponse {
  study_sets: StudentProgress[];
  total_mastery: number;
  total_items_completed: number;
  total_items: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await fetch(`${API_URL}/study-sets/dashboard/stats`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch dashboard stats');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getDashboardAssignments(): Promise<DashboardAssignment[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/dashboard/assignments`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch assignments');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getRecommendations(): Promise<Recommendation[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/dashboard/recommendations`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch recommendations');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface NextRecommendation {
  studySetId: number | null;
  title: string | null;
  topic: string | null;
  difficulty: string | null;
  reason: string;
}

export async function getNextRecommendation(): Promise<NextRecommendation> {
  try {
    const response = await fetch(`${API_URL}/study-sets/recommendations/next`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch next recommendation');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getLeaderboard(classId?: number): Promise<LeaderboardResponse> {
  try {
    const url = classId 
      ? `${API_URL}/study-sets/dashboard/leaderboard?class_id=${classId}`
      : `${API_URL}/study-sets/dashboard/leaderboard`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch leaderboard');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getStreaks(): Promise<StreaksResponse> {
  try {
    const response = await fetch(`${API_URL}/study-sets/dashboard/streaks`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch streaks');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface Question {
  id: number;
  set_id: number;
  type: string;
  content: string;
  correct_answer: string;
  options?: string[];
  term?: string;
  definition?: string;
}

export interface RecordProgressRequest {
  answers: { [questionId: string]: string | number | boolean };
}

export interface RecordProgressResponse {
  mastery_percentage: number;
  correct_answers: number;
  total_questions: number;
}

export async function getStudySetQuestions(setId: number): Promise<Question[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/questions`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch questions');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function recordProgress(setId: number, answers: { [questionId: string]: string | number | boolean }): Promise<RecordProgressResponse> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/progress`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to record progress');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function deleteStudySet(setId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to delete study set');
    }
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
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

export async function addQuestion(setId: number, data: QuestionCreate): Promise<Question> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/questions`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to add question');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function updateQuestion(setId: number, questionId: number, data: QuestionCreate): Promise<Question> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/questions/${questionId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to update question');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function deleteQuestion(setId: number, questionId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/questions/${questionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to delete question');
    }
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export interface Badge {
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

export interface BadgesResponse {
  earned_badges: Badge[];
  available_badges: Badge[];
}

export interface PointsBreakdown {
  total_points: number;
  total_quizzes: number;
  average_accuracy: number;
  breakdown: {
    from_quizzes: number;
    streak_bonus: number;
    accuracy_bonus: number;
  };
}

export async function getAllBadges(): Promise<BadgesResponse> {
  try {
    const response = await fetch(`${API_URL}/study-sets/gamification/badges`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch badges');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getPointsBreakdown(): Promise<PointsBreakdown> {
  try {
    const response = await fetch(`${API_URL}/study-sets/gamification/points`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch points breakdown');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getAnalytics(setId?: number): Promise<AnalyticsResponse> {
  try {
    const url = setId 
      ? `${API_URL}/study-sets/analytics?set_id=${setId}`
      : `${API_URL}/study-sets/analytics`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch analytics');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function getProgress(): Promise<ProgressResponse> {
  try {
    const response = await fetch(`${API_URL}/study-sets/progress`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch progress');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

