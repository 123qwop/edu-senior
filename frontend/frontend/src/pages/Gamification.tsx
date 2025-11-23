import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  LinearProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import StarIcon from '@mui/icons-material/Star'
import { getUserRole, getMe } from '../api/authApi'
import { getLeaderboard, getStreaks, getAllBadges, getPointsBreakdown, getClasses, type LeaderboardResponse, type StreaksResponse, type BadgesResponse, type PointsBreakdown, type ClassOut } from '../api/studySetsApi'

export default function Gamification() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse>({ leaderboard: [], current_user_rank: null })
  const [streaksData, setStreaksData] = useState<StreaksResponse>({ streak: 0, badges: [], next_badge: null })
  const [badgesData, setBadgesData] = useState<BadgesResponse>({ earned_badges: [], available_badges: [] })
  const [pointsData, setPointsData] = useState<PointsBreakdown>({ total_points: 0, total_quizzes: 0, average_accuracy: 0, breakdown: { from_quizzes: 0, streak_bonus: 0, accuracy_bonus: 0 } })
  const [classes, setClasses] = useState<ClassOut[]>([])
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined)
  const [userName, setUserName] = useState<string>('')
  const userRole = getUserRole()
  const isStudent = userRole === 'student'

  useEffect(() => {
    if (isStudent) {
      fetchUserData()
      fetchAllData()
      fetchClasses()
    }
  }, [isStudent, selectedClassId])

  const fetchUserData = async () => {
    try {
      const userData = await getMe()
      if (userData.full_name) {
        setUserName(userData.full_name)
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [leaderboard, streaks, badges, points] = await Promise.all([
        getLeaderboard(selectedClassId),
        getStreaks(),
        getAllBadges(),
        getPointsBreakdown(),
      ])
      setLeaderboardData(leaderboard)
      setStreaksData(streaks)
      setBadgesData(badges)
      setPointsData(points)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gamification data')
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const data = await getClasses()
      setClasses(data)
    } catch (err) {
      console.error('Failed to fetch classes:', err)
    }
  }

  if (!isStudent) {
    return (
      <Box sx={{ py: 4, flexGrow: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
          Gamification
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: 'neutral.500' }}>
            Gamification features are available for students only.
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ py: 4, flexGrow: 1 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        Gamification
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <LocalFireDepartmentIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'neutral.700' }}>
                  {streaksData.streak}
                </Typography>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  Day Streak
                </Typography>
              </Box>
            </Stack>
            {streaksData.next_badge && (
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                  Next: {streaksData.next_badge.name} ({streaksData.next_badge.progress}/{streaksData.next_badge.target})
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(streaksData.next_badge.progress / streaksData.next_badge.target) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <StarIcon sx={{ fontSize: 32, color: 'warning.main' }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700' }}>
                  {pointsData.total_points}
                </Typography>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  Total Points
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  Quizzes Completed
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {pointsData.total_quizzes}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'neutral.500', mb: 0.5 }}>
                  Average Accuracy
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {pointsData.average_accuracy.toFixed(1)}%
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                Leaderboard
              </Typography>
              {classes.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={selectedClassId || ''}
                    onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
                    label="Class"
                  >
                    <MenuItem value="">All Classes</MenuItem>
                    {classes.map((classItem) => (
                      <MenuItem key={classItem.id} value={classItem.id}>
                        {classItem.class_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>

            {leaderboardData.leaderboard.length > 0 || leaderboardData.current_user_rank ? (
              <Stack spacing={2}>
                {leaderboardData.leaderboard.map((entry) => {
                  const isCurrentUser = leaderboardData.current_user_rank && 
                    entry.name.trim().toLowerCase() === leaderboardData.current_user_rank.name.trim().toLowerCase()
                  return (
                    <Box
                      key={entry.rank}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        bgcolor: entry.rank === 1 ? 'primary.50' : isCurrentUser ? 'neutral.50' : entry.rank <= 3 ? 'neutral.50' : 'transparent',
                        borderRadius: 2,
                        border: entry.rank === 1 ? '2px solid' : isCurrentUser ? '2px solid' : '1px solid',
                        borderColor: entry.rank === 1 ? 'primary.main' : isCurrentUser ? 'primary.main' : 'neutral.200',
                      }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: entry.rank === 1 ? 'primary.main' : 'neutral.700',
                          minWidth: 40,
                          textAlign: 'center',
                        }}
                      >
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                      </Typography>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                        {entry.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                          {entry.name}{isCurrentUser ? ' (You)' : ''}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                          {entry.points} points
                        </Typography>
                      </Box>
                    </Box>
                  )
                })}
                {leaderboardData.current_user_rank && 
                 !leaderboardData.leaderboard.some(e => 
                   e.name.trim().toLowerCase() === leaderboardData.current_user_rank!.name.trim().toLowerCase()
                 ) && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      bgcolor: 'neutral.50',
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'neutral.700', minWidth: 40, textAlign: 'center' }}>
                      {leaderboardData.current_user_rank.rank}
                    </Typography>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {leaderboardData.current_user_rank.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                        {leaderboardData.current_user_rank.name} (You)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                        {leaderboardData.current_user_rank.points} points
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  No leaderboard data available yet. Start studying to earn points!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <EmojiEventsIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                Badges & Achievements
              </Typography>
            </Stack>

            {badgesData.earned_badges.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'neutral.700' }}>
                  Earned Badges
                </Typography>
                <Grid container spacing={2}>
                  {badgesData.earned_badges.map((badge, idx) => (
                    <Grid key={idx} size={{ xs: 6, sm: 4, md: 3 }}>
                      <Card
                        elevation={0}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          bgcolor: 'success.50',
                          border: '2px solid',
                          borderColor: 'success.main',
                          height: '100%',
                        }}
                      >
                        <Typography variant="h3" sx={{ mb: 1 }}>
                          {badge.icon}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'neutral.700', mb: 0.5 }}>
                          {badge.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                          {badge.description}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {badgesData.available_badges.length > 0 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'neutral.700' }}>
                  Available Badges
                </Typography>
                <Grid container spacing={2}>
                  {badgesData.available_badges.map((badge, idx) => (
                    <Grid key={idx} size={{ xs: 6, sm: 4, md: 3 }}>
                      <Card
                        elevation={0}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          bgcolor: 'neutral.50',
                          border: '1px solid',
                          borderColor: 'neutral.200',
                          height: '100%',
                        }}
                      >
                        <Typography variant="h3" sx={{ mb: 1, opacity: 0.5 }}>
                          {badge.icon}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'neutral.700', mb: 0.5 }}>
                          {badge.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'neutral.500', mb: 1, display: 'block' }}>
                          {badge.description}
                        </Typography>
                        {badge.progress !== undefined && badge.target !== undefined && (
                          <Box>
                            <LinearProgress
                              variant="determinate"
                              value={(badge.progress / badge.target) * 100}
                              sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
                            />
                            <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                              {badge.progress}/{badge.target}
                            </Typography>
                          </Box>
                        )}
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {badgesData.earned_badges.length === 0 && badgesData.available_badges.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                  No badges available yet. Start studying to earn your first badge!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}