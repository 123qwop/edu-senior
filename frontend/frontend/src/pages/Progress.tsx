import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { getProgress, getRecommendations, type ProgressResponse, type Recommendation } from '../api/studySetsApi'
import { getUserRole } from '../api/authApi'
import {
  formatRecommendationReason,
  recommendationTopicChipLabel,
  translateDifficulty,
  translateSubjectOrClassName,
} from '../utils/recommendationI18n'
import { formatShortLocaleDate } from '../utils/localeDate'

export default function Progress() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [suggestion, setSuggestion] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const userRole = getUserRole()

  useEffect(() => {
    if (userRole !== 'student') {
      navigate('/dashboard')
      return
    }

    fetchData()
  }, [userRole, navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [progressData, recommendations] = await Promise.all([getProgress(), getRecommendations()])
      setProgress(progressData)
      if (recommendations && recommendations.length > 0) {
        setSuggestion(recommendations[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('progress.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) =>
    formatShortLocaleDate(dateString, i18n.language, t('common.never'))

  if (userRole !== 'student') {
    return null
  }

  return (
    <Box sx={{ py: 4, px: 4, flexGrow: 1, maxWidth: '1400px' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        {t('progress.title')}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : progress ? (
        <>
          {suggestion && (
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
                    {t('progress.suggestionOfDay')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {recommendationTopicChipLabel(suggestion.topic, suggestion.topicIsSubject, t)}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.95, mb: 2 }}>
                    {formatRecommendationReason(suggestion, t)}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                      label={translateDifficulty(suggestion.difficulty, t)}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => navigate(`/dashboard/study-sets/${suggestion.set_id}/practice`)}
                      sx={{
                        bgcolor: 'white',
                        color: 'primary.main',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }}
                    >
                      {t('progress.startPracticing')}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          )}

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                    {t('progress.overallMastery')}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {progress.total_mastery}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                    {t('progress.itemsCompleted')}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {progress.total_items_completed} / {progress.total_items}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                    {t('progress.studySetsShort')}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {progress.study_sets.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.200' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'neutral.200' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('progress.studySetProgress')}
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'neutral.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colStudySet')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colSubject')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colMastery')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colProgress')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colAttempts')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colLastActivity')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {progress.study_sets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: 'neutral.500', mb: 2 }}>
                          {t('progress.emptyProgress')}
                        </Typography>
                        <Button variant="contained" onClick={() => navigate('/dashboard/study-sets')}>
                          {t('progress.browseStudySets')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    progress.study_sets.map((set) => (
                      <TableRow key={set.set_id} hover>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {set.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {set.subject ? (
                            <Chip
                              label={translateSubjectOrClassName(set.subject, t)}
                              size="small"
                              sx={{ bgcolor: 'neutral.100' }}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                            <LinearProgress
                              variant="determinate"
                              value={set.mastery_percentage}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              color={
                                set.mastery_percentage >= 80
                                  ? 'success'
                                  : set.mastery_percentage >= 60
                                    ? 'warning'
                                    : 'error'
                              }
                            />
                            <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 600 }}>
                              {set.mastery_percentage}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {set.items_completed} / {set.total_items}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={set.attempts} size="small" sx={{ bgcolor: 'primary.50', color: 'primary.main' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'neutral.600' }}>
                            {formatDate(set.last_activity)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => navigate(`/dashboard/study-sets/${set.set_id}/practice`)}
                          >
                            {t('common.study')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : null}
    </Box>
  )
}
