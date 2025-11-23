import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Stack,
  Collapse,
  IconButton,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { getAnalytics, getStudySets, type AnalyticsResponse, type StudySetOut } from '../api/studySetsApi'
import { getUserRole } from '../api/authApi'

export default function Analytics() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [studySets, setStudySets] = useState<StudySetOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null)
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set())
  const userRole = getUserRole()

  const toggleExpand = (setId: number) => {
    const newExpanded = new Set(expandedSets)
    if (newExpanded.has(setId)) {
      newExpanded.delete(setId)
    } else {
      newExpanded.add(setId)
    }
    setExpandedSets(newExpanded)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return 'Never'
    }
  }

  useEffect(() => {
    if (userRole !== 'teacher') {
      navigate('/dashboard')
      return
    }

    const setIdParam = searchParams.get('setId')
    if (setIdParam) {
      setSelectedSetId(parseInt(setIdParam))
    }

    fetchData()
  }, [searchParams, userRole, navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const setIdParam = searchParams.get('setId')
      const setId = setIdParam ? parseInt(setIdParam) : undefined
      
      const [analyticsData, setsData] = await Promise.all([
        getAnalytics(setId),
        getStudySets(),
      ])
      
      setAnalytics(analyticsData)
      setStudySets(setsData.filter(set => set.creator_id === (setsData[0]?.creator_id || null)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (userRole !== 'teacher') {
    return null
  }

  return (
    <Box sx={{ py: 4, px: 4, flexGrow: 1, maxWidth: '1400px' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        Analytics
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : analytics ? (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                    Total Students
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {analytics.total_students}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                    Average Mastery
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {analytics.average_mastery}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                    Total Assignments
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {analytics.total_assignments}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.200' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'neutral.200' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Study Set Performance
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'neutral.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Study Set</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Average Mastery</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Completion Rate</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Attempts</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.study_sets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                          No study sets with analytics data yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    analytics.study_sets.map((set) => {
                      const isExpanded = expandedSets.has(set.set_id)
                      return (
                        <>
                          <TableRow key={set.set_id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleExpand(set.set_id)}
                                  sx={{ p: 0.5 }}
                                >
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {set.title}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={set.total_students} size="small" sx={{ bgcolor: 'primary.50', color: 'primary.main' }} />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={set.average_mastery}
                                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                  color={set.average_mastery >= 80 ? 'success' : set.average_mastery >= 60 ? 'warning' : 'error'}
                                />
                                <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 600 }}>
                                  {set.average_mastery}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={set.completion_rate}
                                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                  color={set.completion_rate >= 80 ? 'success' : set.completion_rate >= 60 ? 'warning' : 'error'}
                                />
                                <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 600 }}>
                                  {set.completion_rate}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{set.total_attempts}</Typography>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 2, bgcolor: 'neutral.50' }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, px: 2 }}>
                                    Student Progress Details
                                  </Typography>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Mastery</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Last Activity</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {set.students && set.students.length > 0 ? (
                                        set.students.map((student) => (
                                          <TableRow key={student.student_id}>
                                            <TableCell>{student.student_name}</TableCell>
                                            <TableCell>
                                              <Typography variant="body2" sx={{ color: 'neutral.600' }}>
                                                {student.student_email}
                                              </Typography>
                                            </TableCell>
                                            <TableCell>
                                              {student.is_completed ? (
                                                <Chip
                                                  icon={<CheckCircleIcon />}
                                                  label="Completed"
                                                  size="small"
                                                  sx={{ bgcolor: 'success.50', color: 'success.main' }}
                                                />
                                              ) : student.items_completed > 0 ? (
                                                <Chip
                                                  label="In Progress"
                                                  size="small"
                                                  sx={{ bgcolor: 'warning.50', color: 'warning.main' }}
                                                />
                                              ) : (
                                                <Chip
                                                  icon={<CancelIcon />}
                                                  label="Not Started"
                                                  size="small"
                                                  sx={{ bgcolor: 'neutral.100', color: 'neutral.600' }}
                                                />
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {student.mastery > 0 ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                                                  <LinearProgress
                                                    variant="determinate"
                                                    value={student.mastery}
                                                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                                                    color={student.mastery >= 80 ? 'success' : student.mastery >= 60 ? 'warning' : 'error'}
                                                  />
                                                  <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 600, fontSize: '0.75rem' }}>
                                                    {student.mastery}%
                                                  </Typography>
                                                </Box>
                                              ) : (
                                                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                                                  -
                                                </Typography>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <Typography variant="body2">
                                                {student.items_completed} / {student.total_items}
                                              </Typography>
                                            </TableCell>
                                            <TableCell>
                                              <Typography variant="body2" sx={{ color: 'neutral.600', fontSize: '0.75rem' }}>
                                                {formatDate(student.last_activity)}
                                              </Typography>
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      ) : (
                                        <TableRow>
                                          <TableCell colSpan={6} align="center" sx={{ py: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                                              No students assigned to this study set
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </>
                      )
                    })
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