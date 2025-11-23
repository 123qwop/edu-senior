import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { getNextRecommendation, getRecommendations, type NextRecommendation, type Recommendation } from '../api/studySetsApi'
import { getUserRole } from '../api/authApi'

export default function AIRecommendations() {
  const navigate = useNavigate()
  const [nextRecommendation, setNextRecommendation] = useState<NextRecommendation | null>(null)
  const [allRecommendations, setAllRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const userRole = getUserRole()

  useEffect(() => {
    if (userRole !== 'student') {
      navigate('/dashboard')
      return
    }
    fetchRecommendations()
  }, [userRole, navigate])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      const [next, all] = await Promise.all([
        getNextRecommendation(),
        getRecommendations(),
      ])
      setNextRecommendation(next)
      setAllRecommendations(all)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleStudy = (setId: number) => {
    navigate(`/dashboard/study-sets/${setId}/practice`)
  }

  if (userRole !== 'student') {
    return null
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4, px: 4, flexGrow: 1, maxWidth: '1400px' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        AI Recommendations
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Next Recommended Study Set */}
      {nextRecommendation && nextRecommendation.studySetId && (
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
                  onClick={() => handleStudy(nextRecommendation.studySetId!)}
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

      {/* All Recommendations */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
        All Recommendations
      </Typography>

      {allRecommendations.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
          <Typography variant="body1" sx={{ color: 'neutral.500' }}>
            No recommendations available at this time. Complete some study sets to get personalized recommendations!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {allRecommendations.map((rec, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'neutral.200',
                  '&:hover': {
                    boxShadow: 4,
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 1 }}>
                        {rec.topic}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                        {rec.reason}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {rec.difficulty && (
                        <Chip
                          label={rec.difficulty}
                          size="small"
                          sx={{
                            bgcolor: rec.difficulty === 'Easy' ? 'success.50' : rec.difficulty === 'Hard' ? 'error.50' : 'warning.50',
                            color: rec.difficulty === 'Easy' ? 'success.main' : rec.difficulty === 'Hard' ? 'error.main' : 'warning.main',
                          }}
                        />
                      )}
                    </Stack>
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handleStudy(rec.set_id)}
                      fullWidth
                    >
                      Practice
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

