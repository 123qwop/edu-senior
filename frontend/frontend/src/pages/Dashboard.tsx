import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  CircularProgress,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { getMe } from '../api/authApi'
import { translateBadgeName } from '../utils/badgeI18n'
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
import {
  formatRecommendationReason,
  recommendationTopicChipLabel,
  translateDifficulty,
} from '../utils/recommendationI18n'

function dateLocaleForI18n(lng: string) {
  if (lng === 'kz' || lng.startsWith('kk')) return 'kk-KZ'
  if (lng === 'ru' || lng.startsWith('ru')) return 'ru-RU'
  return 'en-US'
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const [firstName, setFirstName] = useState(() => t('dashboard.defaultUserName'))
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStatsType>({})
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [nextRecommendation, setNextRecommendation] = useState<NextRecommendation | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse>({ leaderboard: [], current_user_rank: null })
  const [streaksData, setStreaksData] = useState<StreaksResponse>({ streak: 0, badges: [], next_badge: null })
  const [selectedClassId] = useState<number | undefined>(undefined)
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
        const nameParts = userData.full_name.trim().split(/\s+/)
        setFirstName(nameParts[0] || i18n.t('dashboard.defaultUserName'))
      } else {
        setFirstName(i18n.t('dashboard.defaultUserName'))
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
      if (userRole === 'admin') {
        setLoading(false)
        return
      }
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

  const assignmentStatusLabel = (status: string) => {
    if (status === 'Completed') return t('common.statusCompleted')
    if (status === 'In progress') return t('common.statusInProgress')
    if (status === 'Not started') return t('common.statusNotStarted')
    return status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success'
      case 'In progress':
        return 'warning'
      case 'Not started':
        return 'default'
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

  if (userRole === 'admin') {
    return (
      <Box sx={{ py: 4, px: 2, maxWidth: 720 }}>
        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'neutral.200' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'neutral.700' }}>
            {t('admin.dashboardWelcome', { name: firstName })}
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.600', mb: 3 }}>
            {t('admin.dashboardSubtitle')}
          </Typography>
          <Button variant="contained" component={RouterLink} to="/dashboard/admin" sx={{ bgcolor: 'primary.main' }}>
            {t('admin.openPortal')}
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 1 }}>
              {t('dashboard.welcome', { name: firstName })}
            </Typography>
            {isTeacherView ? (
              <>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 3 }}>
                  {t('dashboard.teacherSubtitle')}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  sx={{ mb: 2, bgcolor: 'primary.main' }}
                  component={RouterLink}
                  to="/dashboard/subjects"
                >
                  {t('dashboard.viewMyClasses')}
                </Button>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  {t('dashboard.activeClassesStudents', {
                    classes: stats.classes_active || 0,
                    students: stats.active_students || 0,
                  })}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 3 }}>
                  {t('dashboard.studentSubtitle')}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  sx={{ mb: 2, bgcolor: 'primary.main' }}
                  onClick={handleContinue}
                >
                  {t('dashboard.continueWhereLeftOff')}
                </Button>
                {recommendations.length > 0 && (
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    {t('dashboard.nextUp', {
                      topic: recommendationTopicChipLabel(
                        recommendations[0].topic,
                        recommendations[0].topicIsSubject,
                        t,
                      ),
                      difficulty: translateDifficulty(recommendations[0].difficulty, t),
                    })}
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
                  {t('dashboard.streaksBadges')}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <LocalFireDepartmentIcon sx={{ color: 'warning.main', fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                  {t('dashboard.streakDays', { count: streaksData.streak })}
                </Typography>
              </Stack>
              {streaksData.badges.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                    {t('dashboard.recentBadges')}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {streaksData.badges.map((badge, idx) => (
                      <Chip
                        key={idx}
                        label={`${badge.icon} ${translateBadgeName(t, badge.badge_id, badge.name)}`}
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
                    {t('dashboard.nextBadge', {
                      name: translateBadgeName(t, streaksData.next_badge.badge_id, streaksData.next_badge.name),
                      progress: streaksData.next_badge.progress,
                      target: streaksData.next_badge.target,
                    })}
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
              {isTeacherView ? t('dashboard.myClassesSection') : t('dashboard.assignedToYou')}
            </Typography>
            {isTeacherView ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 2 }}>
                  {t('dashboard.activeClassesCount', { count: stats.classes_active || 0 })}
                </Typography>
                <Button
                  component={RouterLink}
                  to="/dashboard/subjects"
                  variant="outlined"
                >
                  {t('dashboard.viewAllClasses')}
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
                            {t('common.due')}{' '}
                            {new Date(assignment.due).toLocaleDateString(dateLocaleForI18n(i18n.language))}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                          label={assignmentStatusLabel(assignment.status)}
                          size="small"
                          color={getStatusColor(assignment.status) as 'success' | 'warning' | 'default'}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleStartAssignment(assignment.set_id)}
                        >
                          {assignment.status === 'Completed'
                            ? t('common.review')
                            : assignment.status === 'In progress'
                              ? t('common.continue')
                              : t('common.start')}
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
                  {t('dashboard.viewAllInMyClasses')}
                </Button>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  {t('dashboard.noAssignments')}
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
                    {t('aiPage.recommendedNext')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {nextRecommendation.title}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.95, mb: 2 }}>
                    {formatRecommendationReason(nextRecommendation, t)}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {nextRecommendation.topic && (
                      <Chip
                        label={recommendationTopicChipLabel(
                          nextRecommendation.topic,
                          nextRecommendation.topicIsSubject,
                          t,
                        )}
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
                        label={translateDifficulty(nextRecommendation.difficulty, t)}
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
                      {t('aiPage.startStudying')}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          )}

          {!isTeacherView && (
            <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
                {t('dashboard.moreRecommendations')}
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
                          {recommendationTopicChipLabel(rec.topic, rec.topicIsSubject, t)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                          {formatRecommendationReason(rec, t)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                          label={translateDifficulty(rec.difficulty, t)}
                          size="small"
                          color={getDifficultyColor(rec.difficulty) as 'success' | 'warning' | 'error' | 'default'}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handlePracticeRecommendation(rec.set_id)}
                        >
                          {t('common.practice')}
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    {t('dashboard.noMoreRecommendations')}
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
                    {t('dashboard.onlineSynced')}
                  </Typography>
                </Stack>
                <Button
                  component={RouterLink}
                  to="/dashboard/downloads"
                  variant="outlined"
                  size="small"
                >
                  {t('dashboard.manageOffline')}
                </Button>
              </Stack>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
              {isTeacherView ? t('dashboard.classActivityToday') : t('dashboard.today')}
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  {isTeacherView ? t('dashboard.activeStudents') : t('dashboard.questionsAnsweredToday')}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {isTeacherView ? (stats.active_students || 0) : (stats.questions_answered || 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  {isTeacherView ? t('dashboard.assignmentsSubmitted') : t('dashboard.accuracyToday')}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {isTeacherView ? `${stats.assignments_submitted || 0}` : `${Math.round(stats.accuracy || 0)}%`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  {isTeacherView ? t('dashboard.classesActive') : t('dashboard.timeSpent')}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700' }}>
                  {isTeacherView ? (stats.classes_active || 0) : t('dashboard.minutes', { count: stats.time_spent || 0 })}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {!isTeacherView && (
            <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                  {t('dashboard.classLeaderboard')}
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
                              {student.name}{isCurrentUser ? t('dashboard.youSuffix') : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                              {student.points} {t('common.pts')}
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
                            {leaderboardData.current_user_rank.name}{t('dashboard.youSuffix')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                            {leaderboardData.current_user_rank.points} {t('common.pts')}
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
                    {t('dashboard.viewFullLeaderboard')}
                  </Button>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    {t('dashboard.noLeaderboard')}
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <NotificationsIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                {t('dashboard.recentActivity')}
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
                    {assignments.length > 1
                      ? t('dashboard.newAssignmentsPlural', { count: assignments.length })
                      : t('dashboard.newAssignments', { count: assignments.length })}
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
                    {streaksData.badges.length > 1
                      ? t('dashboard.earnedBadgesPlural', { count: streaksData.badges.length })
                      : t('dashboard.earnedBadges', { count: streaksData.badges.length })}
                  </Typography>
                </Box>
              )}
              {assignments.length === 0 && streaksData.badges.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    {t('dashboard.noRecentActivity')}
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