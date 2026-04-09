import { redirectToLogin } from './authApi';

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
    /** ISO datetime from datetime-local (optional) */
    dueDate?: string;
    /** Optional minutes cap for one practice session */
    timeLimitMinutes?: number;
  };
  is_public?: boolean;
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
  is_public?: boolean;
  is_shared?: boolean;
  /** immediate = check during practice; end_only = stricter (typical teacher assignment default) */
  practice_feedback_mode?: 'immediate' | 'end_only';
  /** When practice opened with ?assignment_id= (server-validated) */
  active_assignment_id?: number | null;
  assignment_due_date?: string | null;
  assignment_time_limit_minutes?: number | null;
}

export interface QuestionCreate {
  type: string;
  content: string;
  correct_answer: string;
  explanation?: string | null;
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
  explanation?: string | null;
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

/** Auth is sent via httpOnly cookies (credentials: 'include'). */
function getAuthHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
    }
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
      credentials: 'include',
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
      credentials: 'include',
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
export async function getStudySet(
  setId: number,
  opts?: { assignmentId?: number }
): Promise<StudySetOut> {
  try {
    const params = new URLSearchParams();
    if (opts?.assignmentId != null) {
      params.set('assignment_id', String(opts.assignmentId));
    }
    const q = params.toString();
    const response = await fetch(`${API_URL}/study-sets/${setId}${q ? `?${q}` : ''}`, {
      method: 'GET',
      credentials: 'include',
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
      credentials: 'include',
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
      credentials: 'include',
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
      credentials: 'include',
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
      credentials: 'include',
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
      credentials: 'include',
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
  /** Optional max minutes for one practice session (server stores; client enforces timer) */
  time_limit_minutes?: number | null;
  /** 'immediate' = students can check answers during practice; 'end_only' = feedback mainly after submit */
  practice_feedback_mode?: 'immediate' | 'end_only';
}

// Create an assignment (assign study set to class)
export async function createAssignment(classId: number, data: CreateAssignmentRequest): Promise<{ message: string; assignment_id: number }> {
  try {
    const response = await fetch(`${API_URL}/study-sets/classes/${classId}/assignments`, {
      method: 'POST',
      credentials: 'include',
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
  time_limit_minutes?: number | null;
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
      credentials: 'include',
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
      credentials: 'include',
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

/** Class assignment row for teacher edit (due / time limit). */
export interface StudySetAssignmentTeacherRow {
  assignment_id: number;
  class_id: number;
  class_name: string;
  due_date: string | null;
  time_limit_minutes: number | null;
}

export async function getStudySetAssignmentsForTeacher(
  setId: number,
): Promise<StudySetAssignmentTeacherRow[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/set/${setId}/assignments`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse<StudySetAssignmentTeacherRow[]>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

export async function patchStudySetAssignment(
  assignmentId: number,
  data: { due_date?: string | null; time_limit_minutes?: number | null },
): Promise<StudySetAssignmentTeacherRow> {
  try {
    const response = await fetch(`${API_URL}/study-sets/assignments/${assignmentId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<StudySetAssignmentTeacherRow>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
    }
    throw err;
  }
}

// Update a study set
export async function updateStudySet(setId: number, data: StudySetUpdate): Promise<StudySetOut> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}`, {
      method: 'PUT',
      credentials: 'include',
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
  time_limit_minutes?: number | null;
}

export interface Recommendation {
  topic: string;
  reason: string;
  difficulty: string;
  set_id: number;
  /** When true, `topic` is a subject line (translate). When false/omitted, `topic` is a study set title (show as-is). */
  topicIsSubject?: boolean;
  reasonKey?: string;
  reasonParams?: Record<string, unknown>;
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

export interface StreakBadge {
  name: string;
  icon: string;
  badge_id?: string;
}

export interface NextBadge {
  name: string;
  progress: number;
  target: number;
  badge_id?: string;
}

export interface StreaksResponse {
  streak: number;
  badges: StreakBadge[];
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
  topicIsSubject?: boolean;
  reasonKey?: string;
  reasonParams?: Record<string, unknown>;
}

export async function getNextRecommendation(): Promise<NextRecommendation> {
  try {
    const response = await fetch(`${API_URL}/study-sets/recommendations/next`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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

/** Rule-based picks from practice history (GET /study-sets/recommendations/me). Not Gemini. */
export interface RuleBasedRecommendationItem {
  id: number;
  title: string;
  subject: string;
  level: string;
  reason: string;
}

export async function getRuleBasedRecommendations(): Promise<RuleBasedRecommendationItem[]> {
  try {
    const response = await fetch(`${API_URL}/study-sets/recommendations/me`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (response.status === 401) {
      redirectToLogin();
      return [];
    }
    if (response.status === 403) {
      return [];
    }
    if (!response.ok) {
      return [];
    }
    const data = (await response.json().catch(() => ({}))) as { recommendations?: unknown };
    const recs = data.recommendations;
    if (!Array.isArray(recs)) {
      return [];
    }
    return recs
      .map((r: unknown) => r as Record<string, unknown>)
      .filter(
        (r) =>
          r &&
          typeof r.id === 'number' &&
          typeof r.title === 'string' &&
          typeof r.reason === 'string',
      )
      .map((r) => ({
        id: r.id as number,
        title: r.title as string,
        subject: typeof r.subject === 'string' ? r.subject : '',
        level: typeof r.level === 'string' ? r.level : '',
        reason: r.reason as string,
      }));
  } catch {
    return [];
  }
}

export async function getLeaderboard(classId?: number): Promise<LeaderboardResponse> {
  try {
    const url = classId 
      ? `${API_URL}/study-sets/dashboard/leaderboard?class_id=${classId}`
      : `${API_URL}/study-sets/dashboard/leaderboard`;
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
  explanation?: string | null;
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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

export async function addQuestion(setId: number, data: QuestionCreate): Promise<Question> {
  try {
    const response = await fetch(`${API_URL}/study-sets/${setId}/questions`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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

export interface GamificationBadge {
  badge_id?: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  progress?: number;
  target?: number;
  /** Dynamic values for translating `earnedDesc` (e.g. count) */
  i18n_params?: Record<string, number | string>;
}

export interface BadgesResponse {
  earned_badges: GamificationBadge[];
  available_badges: GamificationBadge[];
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) redirectToLogin();
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

/** Gemini AI (requires GEMINI_API_KEY on backend) */
export async function getAiStatus(): Promise<{ enabled: boolean }> {
  const response = await fetch(`${API_URL}/study-sets/ai/status`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    return { enabled: false };
  }
  return response.json();
}

export async function aiHint(body: {
  question: string;
  topic?: string;
  /** App UI language (en / ru / kz) so the model replies in the same language. */
  response_language?: string;
}): Promise<{ text: string }> {
  const response = await fetch(`${API_URL}/study-sets/ai/hint`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      typeof errorData.detail === 'string' ? errorData.detail : 'AI hint failed'
    );
  }
  return response.json();
}

export async function aiExplain(body: {
  question: string;
  user_answer: string;
  correct_answer?: string;
  subject?: string;
  response_language?: string;
}): Promise<{ text: string }> {
  const response = await fetch(`${API_URL}/study-sets/ai/explain`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      typeof errorData.detail === 'string' ? errorData.detail : 'AI explanation failed'
    );
  }
  return response.json();
}

export async function aiFeedback(body: {
  question: string;
  user_answer: string;
  is_correct: boolean;
  correct_answer?: string;
  topic?: string;
  response_language?: string;
}): Promise<{ text: string }> {
  const response = await fetch(`${API_URL}/study-sets/ai/feedback`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      typeof errorData.detail === 'string' ? errorData.detail : 'AI feedback failed'
    );
  }
  return response.json();
}

export async function aiGenerateQuestions(body: {
  topic: string;
  difficulty?: string;
  count?: number;
  question_type?: string;
}): Promise<{ text: string }> {
  const response = await fetch(`${API_URL}/study-sets/ai/generate-questions`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      typeof errorData.detail === 'string' ? errorData.detail : 'AI question generation failed'
    );
  }
  return response.json();
}

