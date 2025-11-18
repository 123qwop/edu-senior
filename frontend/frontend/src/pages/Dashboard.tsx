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
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { getMe } from '../api/authApi'

export default function Dashboard() {
  const [firstName, setFirstName] = useState('User')

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getMe()
        console.log('User data received:', userData)
        if (userData.full_name) {
          // Extract first name from full name
          const nameParts = userData.full_name.trim().split(' ')
          setFirstName(nameParts[0] || 'User')
        } else {
          console.warn('No full_name in user data:', userData)
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
        // Keep default "User" if fetch fails
      }
    }

    fetchUserData()
  }, [])
  const todayGoal = { questions: 20, timeLeft: 10 }
  const nextUp = {
    topicName: 'Derivatives',
    difficulty: 'Medium',
    time: 15,
  }

  // Today's progress data
  const todayProgress = {
    questionsAnswered: 12,
    accuracy: 85,
    timeSpent: 45,
  }

  // Streak data
  const streak = 5
  const badges = [
    { name: 'Consistency', icon: '🔥' },
    { name: 'Quick Learner', icon: '⚡' },
  ]
  const nextBadge = { name: 'Quiz Master', progress: 2, target: 5 }

  // Upcoming assignments
  const assignments = [
    { id: 1, title: 'Calculus - Limits Practice', due: '2025-01-20', status: 'In progress' },
    { id: 2, title: 'Algebra Review Set', due: '2025-01-22', status: 'Not started' },
    { id: 3, title: 'Trigonometry Quiz', due: '2025-01-25', status: 'Not started' },
  ]

  // AI Recommendations
  const recommendations = [
    { topic: 'Functions', reason: 'You missed 3 questions last time', difficulty: 'Medium' },
    { topic: 'Linear Algebra basics', reason: 'New topic', difficulty: 'Easy' },
    { topic: 'Integration Techniques', reason: 'Based on your progress', difficulty: 'Hard' },
  ]

  // Leaderboard
  const leaderboard = [
    { rank: 1, name: 'Alex Johnson', points: 1250 },
    { rank: 2, name: 'Sarah Chen', points: 1180 },
    { rank: 3, name: 'Mike Davis', points: 1100 },
  ]
  const currentUserRank = { rank: 5, name: firstName, points: 980 }

  // Notifications
  const notifications = [
    { type: 'assignment', text: 'New assignment from Dr. Smith in Mathematics' },
    { type: 'badge', text: "You earned the 'Consistency' badge" },
    { type: 'reminder', text: "Reminder: Finish 'Derivatives – Practice Set'" },
  ]

  const offlineStatus = { isOffline: false, lastSynced: '2 minutes ago' }

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

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* Left Column - Main Content */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Welcome Section */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 1 }}>
              Welcome back, {firstName}!
            </Typography>
            <Typography variant="body2" sx={{ color: 'neutral.500', mb: 3 }}>
              Goal: {todayGoal.questions} questions • {todayGoal.timeLeft} min left
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              sx={{ mb: 2, bgcolor: 'primary.main' }}
            >
              Continue where you left off
            </Button>
            <Typography variant="body2" sx={{ color: 'neutral.500' }}>
              Next up: {nextUp.topicName} • {nextUp.difficulty} • Estimated {nextUp.time} min
            </Typography>
          </Paper>

          {/* Streaks & Gamification */}
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
                {streak}-day streak
              </Typography>
            </Stack>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                Recent badges:
              </Typography>
              <Stack direction="row" spacing={1}>
                {badges.map((badge, idx) => (
                  <Chip
                    key={idx}
                    label={`${badge.icon} ${badge.name}`}
                    size="small"
                    sx={{ bgcolor: 'primary.50', color: 'primary.main' }}
                  />
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                Next badge: {nextBadge.name} ({nextBadge.progress}/{nextBadge.target} quizzes)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(nextBadge.progress / nextBadge.target) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Paper>

          {/* Upcoming Assignments */}
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
              Assigned to you
            </Typography>
            <Stack spacing={2}>
              {assignments.map((assignment) => (
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
                    <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                      Due {assignment.due}
                    </Typography>
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
                      startIcon={assignment.status === 'In progress' ? <PlayArrowIcon /> : <PlayArrowIcon />}
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
              View all in My subjects
            </Button>
          </Paper>

          {/* AI Recommendations */}
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
              Recommended for you
            </Typography>
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
                    <Button variant="outlined" size="small">
                      Practice
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* Offline & Sync Status */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'neutral.50' }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                {offlineStatus.isOffline ? (
                  <CloudOffIcon sx={{ color: 'warning.main' }} />
                ) : (
                  <CloudDoneIcon sx={{ color: 'success.main' }} />
                )}
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  Offline mode: {offlineStatus.isOffline ? 'On' : 'Off'} • Last synced {offlineStatus.lastSynced}
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
        </Grid>

        {/* Right Column - Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Today's Progress */}
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
              Today
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  Questions answered today
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {todayProgress.questionsAnswered}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  Accuracy today
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {todayProgress.accuracy}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  Time spent
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700' }}>
                  {todayProgress.timeSpent} min
                </Typography>
              </Box>
            </Stack>
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'neutral.300' }}>
              <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                7-day activity
              </Typography>
              <Box
                sx={{
                  height: 40,
                  bgcolor: 'neutral.100',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                  Sparkline chart placeholder
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Leaderboard */}
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                Class leaderboard
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select value="Class A" sx={{ fontSize: '0.875rem' }}>
                  <MenuItem value="Class A">Class A</MenuItem>
                  <MenuItem value="Class B">Class B</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack spacing={2}>
              {leaderboard.map((student) => (
                <Box
                  key={student.rank}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    bgcolor: student.rank === 1 ? 'primary.50' : 'transparent',
                    borderRadius: 2,
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
                      {student.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                      {student.points} pts
                    </Typography>
                  </Box>
                </Box>
              ))}
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
                  {currentUserRank.rank}
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {currentUserRank.name.charAt(0)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                    {currentUserRank.name} (You)
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                    {currentUserRank.points} pts
                  </Typography>
                </Box>
              </Box>
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
          </Paper>

          {/* Notifications */}
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <NotificationsIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                Recent activity
              </Typography>
            </Stack>
            <Stack spacing={1.5}>
              {notifications.map((notif, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    bgcolor: 'neutral.50',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'neutral.700' }}>
                    {notif.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Button sx={{ mt: 2 }} size="small" fullWidth>
              View all
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
