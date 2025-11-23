import { useState, useEffect } from 'react'
import {
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Chip,
  LinearProgress,
  Stack,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { getMe, getUserRole } from '../api/authApi'
import {
  getDashboardStats,
  getDashboardAssignments,
  getRecommendations,
  getNextRecommendation,
  getLeaderboard,
  getStreaks,
  type DashboardStats as DashboardStatsType,
  type DashboardAssignment,
  type Recommendation,
  type NextRecommendation,
  type LeaderboardResponse,
  type StreaksResponse,
} from '../api/studySetsApi'

export default function Dashboard() {
  const [firstName, setFirstName] = useState('User')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStatsType>({})
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [nextRecommendation, setNextRecommendation] = useState<NextRecommendation | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse>({ leaderboard: [], current_user_rank: null })
  const [streaksData, setStreaksData] = useState<StreaksResponse>({ streak: 0, badges: [], next_badge: null })
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    if (userRole) {
      fetchDashboardData()
    }
  }, [userRole, selectedClassId])

  const fetchUserData = async () => {
    try {
      const userData = await getMe()
      if (userData.full_name) {
        const nameParts = userData.full_name.trim().split(' ')
        setFirstName(nameParts[0] || 'User')
        setUserName(userData.full_name)
      }
      if (userData.id) {
        setUserId(userData.id)
      }
      if (userData.role) {
        setUserRole(userData.role)
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, assignmentsData, recommendationsData, nextRecData, leaderboardDataResult, streaksDataResult] = await Promise.all([
        getDashboardStats(),
        userRole === 'student' ? getDashboardAssignments() : Promise.resolve([]),
        userRole === 'student' ? getRecommendations() : Promise.resolve([]),
        userRole === 'student' ? getNextRecommendation() : Promise.resolve(null),
        userRole === 'student' ? getLeaderboard(selectedClassId) : Promise.resolve({ leaderboard: [], current_user_rank: null }),
        userRole === 'student' ? getStreaks() : Promise.resolve({ streak: 0, badges: [], next_badge: null }),
      ])

      setStats(statsData)
      setAssignments(assignmentsData)
      setRecommendations(recommendationsData)
      setNextRecommendation(nextRecData)
      setLeaderboardData(leaderboardDataResult)
      setStreaksData(streaksDataResult)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const isTeacherView = userRole === 'teacher'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success'
      case 'In progress':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'success'
      case 'Medium':
        return 'warning'
      case 'Hard':
        return 'error'
      default:
        return 'default'
    }
  }

  const handleStartAssignment = (setId: number) => {
    navigate(`/dashboard/study-sets?setId=${setId}`)
  }

  const handlePracticeRecommendation = (setId: number) => {
    navigate(`/dashboard/study-sets?setId=${setId}`)
  }

  const handleContinue = () => {
    if (assignments.length > 0) {
      const inProgress = assignments.find(a => a.status === 'In progress')
      if (inProgress) {
        handleStartAssignment(inProgress.set_id)
      } else {
        handleStartAssignment(assignments[0].set_id)
      }
    } else if (recommendations.length > 0) {
      handlePracticeRecommendation(recommendations[0].set_id)
    } else {
      navigate('/dashboard/study-sets')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 1 }}>
              Welcome back, {firstName}!
            </Typography>
            {isTeacherView ? (
              <>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 3 }}>
                  Manage your classes and track student progress
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  sx={{ mb: 2, bgcolor: 'primary.main' }}
                  component={RouterLink}
                  to="/dashboard/subjects"
                >
                  View My Classes
                </Button>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  {stats.classes_active || 0} active classes • {stats.active_students || 0} students active today
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 3 }}>
                  Keep up your learning streak!
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  sx={{ mb: 2, bgcolor: 'primary.main' }}
                  onClick={handleContinue}
                >
                  Continue where you left off
                </Button>
                {recommendations.length > 0 && (
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    Next up: {recommendations[0].topic} • {recommendations[0].difficulty}
                  </Typography>
                )}
              </>
            )}
          </Paper>

          {!isTeacherView && (
            <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <EmojiEventsIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                  Streaks & Badges
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <LocalFireDepartmentIcon sx={{ color: 'warning.main', fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                  {streaksData.streak}-day streak
                </Typography>
              </Stack>
              {streaksData.badges.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                    Recent badges:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {streaksData.badges.map((badge, idx) => (
                      <Chip
                        key={idx}
                        label={`${badge.icon} ${badge.name}`}
                        size="small"
                        sx={{ bgcolor: 'primary.50', color: 'primary.main' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
              {streaksData.next_badge && (
                <Box>
                  <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                    Next badge: {streaksData.next_badge.name} ({streaksData.next_badge.progress}/{streaksData.next_badge.target})
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(streaksData.next_badge.progress / streaksData.next_badge.target) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
              {isTeacherView ? 'My Classes' : 'Assigned to you'}
            </Typography>
            {isTeacherView ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 2 }}>
                  {stats.classes_active || 0} active classes
                </Typography>
                <Button
                  component={RouterLink}
                  to="/dashboard/subjects"
                  variant="outlined"
                >
                  View all classes
                </Button>
              </Box>
            ) : assignments.length > 0 ? (
              <>
                <Stack spacing={2}>
                  {assignments.slice(0, 5).map((assignment) => (
                    <Box
                      key={assignment.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        bgcolor: 'neutral.50',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'neutral.700', mb: 0.5 }}>
                          {assignment.title}
                        </Typography>
                        {assignment.due && (
                          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                            Due {new Date(assignment.due).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                          label={assignment.status}
                          size="small"
                          color={getStatusColor(assignment.status) as 'success' | 'warning' | 'default'}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleStartAssignment(assignment.set_id)}
                        >
                          {assignment.status === 'Completed' ? 'Review' : assignment.status === 'In progress' ? 'Continue' : 'Start'}
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
                <Button
                  component={RouterLink}
                  to="/dashboard/subjects"
                  sx={{ mt: 2 }}
                  size="small"
                >
                  View all in My classes
                </Button>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  No assignments yet
                </Typography>
              </Box>
            )}
          </Paper>

          {!isTeacherView && nextRecommendation && nextRecommendation.studySetId && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                background: 'linear-gradient(135deg, #2593BE 0%, #6C63FF 100%)',
                borderRadius: 3,
                p: 3,
                color: 'white',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LightbulbIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 1, mb: 0.5 }}>
                    RECOMMENDED NEXT
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {nextRecommendation.title}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.95, mb: 2 }}>
                    {nextRecommendation.reason}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {nextRecommendation.topic && (
                      <Chip
                        label={nextRecommendation.topic}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {nextRecommendation.difficulty && (
                      <Chip
                        label={nextRecommendation.difficulty}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handlePracticeRecommendation(nextRecommendation.studySetId!)}
                      sx={{
                        bgcolor: 'white',
                        color: 'primary.main',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }}
                    >
                      Start Studying
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          )}

          {!isTeacherView && (
            <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
                More Recommendations
              </Typography>
              {recommendations.length > 0 ? (
                <Stack spacing={2}>
                  {recommendations.map((rec, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        bgcolor: 'neutral.50',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'neutral.700', mb: 0.5 }}>
                          {rec.topic}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                          {rec.reason}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                          label={rec.difficulty}
                          size="small"
                          color={getDifficultyColor(rec.difficulty) as 'success' | 'warning' | 'error' | 'default'}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handlePracticeRecommendation(rec.set_id)}
                        >
                          Practice
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    No additional recommendations yet
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {!isTeacherView && (
            <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'neutral.50' }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CloudDoneIcon sx={{ color: 'success.main' }} />
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    Online • Synced
                  </Typography>
                </Stack>
                <Button
                  component={RouterLink}
                  to="/dashboard/downloads"
                  variant="outlined"
                  size="small"
                >
                  Manage offline downloads
                </Button>
              </Stack>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
              {isTeacherView ? 'Class Activity Today' : 'Today'}
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  {isTeacherView ? 'Active students' : 'Questions answered today'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {isTeacherView ? (stats.active_students || 0) : (stats.questions_answered || 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  {isTeacherView ? 'Assignments submitted' : 'Accuracy today'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {isTeacherView ? `${stats.assignments_submitted || 0}` : `${Math.round(stats.accuracy || 0)}%`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  {isTeacherView ? 'Classes active' : 'Time spent'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700' }}>
                  {isTeacherView ? (stats.classes_active || 0) : `${stats.time_spent || 0} min`}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {!isTeacherView && (
            <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                  Class leaderboard
                </Typography>
              </Stack>
              {leaderboardData.leaderboard.length > 0 || leaderboardData.current_user_rank ? (
                <>
                  <Stack spacing={2}>
                    {leaderboardData.leaderboard.slice(0, 3).map((student) => {
                      const isCurrentUser = leaderboardData.current_user_rank && 
                        student.name.trim().toLowerCase() === leaderboardData.current_user_rank.name.trim().toLowerCase()
                      return (
                        <Box
                          key={student.rank}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            bgcolor: student.rank === 1 ? 'primary.50' : isCurrentUser ? 'neutral.50' : 'transparent',
                            borderRadius: 2,
                            border: isCurrentUser ? '2px solid' : 'none',
                            borderColor: isCurrentUser ? 'primary.main' : 'transparent',
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'neutral.700', minWidth: 24 }}>
                            {student.rank}
                          </Typography>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {student.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                              {student.name}{isCurrentUser ? ' (You)' : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                              {student.points} pts
                            </Typography>
                          </Box>
                        </Box>
                      )
                    })}
                    {leaderboardData.current_user_rank && 
                     !leaderboardData.leaderboard.some(s => 
                       s.name.trim().toLowerCase() === leaderboardData.current_user_rank!.name.trim().toLowerCase()
                     ) && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          bgcolor: 'neutral.50',
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: 'primary.main',
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'neutral.700', minWidth: 24 }}>
                          {leaderboardData.current_user_rank.rank}
                        </Typography>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {leaderboardData.current_user_rank.name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                            {leaderboardData.current_user_rank.name} (You)
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                            {leaderboardData.current_user_rank.points} pts
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Stack>
                  <Button
                    component={RouterLink}
                    to="/dashboard/gamification"
                    sx={{ mt: 2 }}
                    size="small"
                    fullWidth
                  >
                    View full leaderboard
                  </Button>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    No leaderboard data yet
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <NotificationsIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                Recent activity
              </Typography>
            </Stack>
            <Stack spacing={1.5}>
              {assignments.length > 0 && !isTeacherView && (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'neutral.50',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'neutral.700' }}>
                    {assignments.length} new assignment{assignments.length > 1 ? 's' : ''} assigned
                  </Typography>
                </Box>
              )}
              {streaksData.badges.length > 0 && !isTeacherView && (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'neutral.50',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'neutral.700' }}>
                    You earned {streaksData.badges.length} badge{streaksData.badges.length > 1 ? 's' : ''}!
                  </Typography>
                </Box>
              )}
              {assignments.length === 0 && streaksData.badges.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    No recent activity
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}