import { Box, Typography, Paper, Tabs, Tab, Chip, CircularProgress, Alert, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, LinearProgress, Grid, Card, CardContent, Stack } from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { translateSubjectOrClassName } from '../utils/recommendationI18n'
import { formatShortLocaleDate } from '../utils/localeDate'
import { getClasses, getClassStudents, removeStudentFromClass, getClassAssignments, getClassStudentsProgress, getLeaderboard, type ClassOut, type Student, type Assignment, type StudentProgressDetail, type LeaderboardResponse } from '../api/studySetsApi'
import { getUserRole } from '../api/authApi'
import ClassIcon from '@mui/icons-material/Class'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PeopleIcon from '@mui/icons-material/People'
import AssignmentIcon from '@mui/icons-material/Assignment'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import AddStudentsDialog from '../components/AddStudentsDialog'
import AddAssignmentDialog from '../components/AddAssignmentDialog'
import EmojiEvents from '@mui/icons-material/EmojiEvents'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function levelMenuLabel(value: string, t: TFunction): string {
  const keys: Record<string, string> = {
    'Grade 7': 'classes.levelGrade7',
    'Grade 8': 'classes.levelGrade8',
    'Grade 9': 'classes.levelGrade9',
    'Grade 10': 'classes.levelGrade10',
    'Grade 11': 'classes.levelGrade11',
    'Grade 12': 'classes.levelGrade12',
  }
  const k = keys[value]
  return k ? t(k) : value
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`class-tabpanel-${index}`}
      aria-labelledby={`class-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function ClassDetail() {
  const { t, i18n } = useTranslation()
  const { classId } = useParams<{ classId: string }>()
  const [currentTab, setCurrentTab] = useState(() => {
    // Check if we're coming from Classes page with tab state
    const state = window.history.state
    return state?.tab ?? 0
  })
  const [classData, setClassData] = useState<ClassOut | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [studentProgress, setStudentProgress] = useState<StudentProgressDetail[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse>({ leaderboard: [], current_user_rank: null })
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addStudentsDialogOpen, setAddStudentsDialogOpen] = useState(false)
  const [addAssignmentDialogOpen, setAddAssignmentDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null)
  const [removing, setRemoving] = useState(false)
  const userRole = getUserRole()
  const isTeacher = userRole === 'teacher'

  useEffect(() => {
    fetchClassData()
  }, [classId])

  useEffect(() => {
    if (classId && currentTab === 0) {
      fetchStudents()
      if (isTeacher) {
        fetchStudentProgress()
      }
    }
    if (classId && currentTab === 1) {
      fetchAssignments()
    }
    if (classId && currentTab === 2) {
      fetchLeaderboard()
    }
    if (classId && currentTab === 3 && isTeacher) {
      fetchStudentProgress()
    }
  }, [classId, currentTab, isTeacher])

  const fetchClassData = async () => {
    if (!classId) {
      setError(t('common.classIdMissing'))
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const classes = await getClasses()
      const found = classes.find((c) => c.id === parseInt(classId))
      if (found) {
        setClassData(found)
      } else {
        setError(t('common.classNotFound'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadClassFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    if (!classId) return

    try {
      setLoadingStudents(true)
      const data = await getClassStudents(parseInt(classId))
      setStudents(data)
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchAssignments = async () => {
    if (!classId) return

    try {
      setLoadingAssignments(true)
      const data = await getClassAssignments(parseInt(classId))
      setAssignments(data)
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
    } finally {
      setLoadingAssignments(false)
    }
  }

  const fetchStudentProgress = async () => {
    if (!classId || !isTeacher) return

    try {
      setLoadingProgress(true)
      const data = await getClassStudentsProgress(parseInt(classId))
      setStudentProgress(data)
    } catch (err) {
      console.error('Failed to fetch student progress:', err)
    } finally {
      setLoadingProgress(false)
    }
  }

  const fetchLeaderboard = async () => {
    if (!classId) return

    try {
      setLoadingLeaderboard(true)
      if (isTeacher) {
        // For teachers, create leaderboard from student progress data
        // First ensure we have students and progress data
        if (students.length === 0) {
          await fetchStudents()
        }
        if (studentProgress.length === 0) {
          await fetchStudentProgress()
        }
        
        // Create leaderboard from progress data
        const leaderboardData = studentProgress
          .map((p) => {
            const student = students.find((s) => s.id === p.student_id)
            return {
              rank: 0, // Will be set after sorting
              name: student?.name || t('common.unknown'),
              points: Math.round(p.average_mastery * 10), // Convert mastery to points
            }
          })
          .sort((a, b) => b.points - a.points)
          .map((entry, index) => ({
            ...entry,
            rank: index + 1,
          }))
        setLeaderboard({ leaderboard: leaderboardData, current_user_rank: null })
      } else {
        // For students, use the API endpoint
        const data = await getLeaderboard(parseInt(classId))
        setLeaderboard(data)
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  const handleRemoveClick = (student: Student) => {
    setStudentToRemove(student)
    setRemoveDialogOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!classId || !studentToRemove) return

    try {
      setRemoving(true)
      await removeStudentFromClass(parseInt(classId), studentToRemove.id)
      setRemoveDialogOpen(false)
      setStudentToRemove(null)
      fetchStudents() // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.removeStudentFailed'))
    } finally {
      setRemoving(false)
    }
  }

  const handleRemoveCancel = () => {
    setRemoveDialogOpen(false)
    setStudentToRemove(null)
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !classData) {
    return (
      <Box sx={{ py: 4, flexGrow: 1 }}>
        <Alert severity="error">{error || t('common.classNotFound')}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          component={RouterLink}
          to="/dashboard/subjects"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: 'neutral.600',
            textDecoration: 'none',
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          <ArrowBackIcon sx={{ mr: 1 }} />
          <Typography variant="body2">{t('common.backToClasses')}</Typography>
        </Box>
      </Box>

      {/* Title Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <ClassIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700' }}>
              {classData.class_name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              {classData.subject && (
                <Chip
                  label={translateSubjectOrClassName(classData.subject, t)}
                  size="small"
                  sx={{
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    fontWeight: 500,
                  }}
                />
              )}
              {classData.level && (
                <Chip
                  label={levelMenuLabel(classData.level, t)}
                  size="small"
                  sx={{
                    bgcolor: 'neutral.100',
                    color: 'neutral.700',
                    fontWeight: 500,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'neutral.200' }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab
            icon={<PeopleIcon />}
            iconPosition="start"
            label={t('common.tabStudents')}
            id="class-tab-0"
            aria-controls="class-tabpanel-0"
          />
          <Tab
            icon={<AssignmentIcon />}
            iconPosition="start"
            label={t('common.tabAssignments')}
            id="class-tab-1"
            aria-controls="class-tabpanel-1"
          />
          <Tab
            icon={<EmojiEventsIcon />}
            iconPosition="start"
            label={t('common.tabLeaderboard')}
            id="class-tab-2"
            aria-controls="class-tabpanel-2"
          />
          <Tab
            icon={<AnalyticsIcon />}
            iconPosition="start"
            label={t('common.tabAnalytics')}
            id="class-tab-3"
            aria-controls="class-tabpanel-3"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Paper elevation={0} sx={{ mt: 2, p: 3 }}>
        <TabPanel value={currentTab} index={0}>
          {students.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('common.studentsCount', { count: students.length })}
              </Typography>
              {isTeacher && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddStudentsDialogOpen(true)}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  {t('common.addStudents')}
                </Button>
              )}
            </Box>
          )}

          {loadingStudents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
              <Typography variant="body1" sx={{ color: 'neutral.500', mb: 2 }}>
                {t('common.noStudentsEnrolled')}
              </Typography>
              {isTeacher && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddStudentsDialogOpen(true)}
                >
                  {t('common.addStudents')}
                </Button>
              )}
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.300' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'neutral.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{t('common.name')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('common.email')}</TableCell>
                    {isTeacher && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>{t('common.assignmentsCol')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('common.avgMastery')}</TableCell>
                      </>
                    )}
                    <TableCell sx={{ fontWeight: 600 }}>{t('common.statusCol')}</TableCell>
                    {isTeacher && <TableCell sx={{ fontWeight: 600 }}>{t('common.actions')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingProgress && isTeacher ? (
                    <TableRow>
                      <TableCell colSpan={isTeacher ? 6 : 3} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => {
                      const progress = isTeacher ? studentProgress.find(p => p.student_id === student.id) : null
                      return (
                        <TableRow
                          key={student.id}
                          hover
                          sx={{
                            '&:hover': {
                              bgcolor: 'neutral.50',
                            },
                          }}
                        >
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          {isTeacher && (
                            <>
                              <TableCell>
                                {progress ? (
                                  <Typography variant="body2">
                                    {progress.assignments_completed} / {progress.assignments_total}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                                    {assignments.length > 0 ? `0 / ${assignments.length}` : t('common.noAssignmentsForStudent')}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {progress && progress.average_mastery > 0 ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={progress.average_mastery}
                                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                      color={progress.average_mastery >= 80 ? 'success' : progress.average_mastery >= 60 ? 'warning' : 'error'}
                                    />
                                    <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 600 }}>
                                      {progress.average_mastery}%
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Chip
                              label={t('common.enrolled')}
                              size="small"
                              sx={{
                                bgcolor: 'success.50',
                                color: 'success.main',
                                fontWeight: 500,
                              }}
                            />
                          </TableCell>
                          {isTeacher && (
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveClick(student)}
                                sx={{ color: 'error.main' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('common.assignmentsStudySets')}
            </Typography>
            {isTeacher && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddAssignmentDialogOpen(true)}
                sx={{ bgcolor: 'primary.main' }}
              >
                {t('classes.addAssignment')}
              </Button>
            )}
          </Box>

          {loadingAssignments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : assignments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
              <Typography variant="body1" sx={{ color: 'neutral.500', mb: 2 }}>
                {t('common.noAssignmentsYetClass')}
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.300' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'neutral.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colStudySet')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('progress.colSubject')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('studySets.type')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('common.dueDate')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow
                      key={assignment.assignment_id}
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: 'neutral.50',
                        },
                      }}
                    >
                      <TableCell>{assignment.title}</TableCell>
                      <TableCell>
                        {assignment.subject && (
                          <Chip
                            label={translateSubjectOrClassName(assignment.subject, t)}
                            size="small"
                            sx={{
                              bgcolor: 'primary.50',
                              color: 'primary.main',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{assignment.type}</TableCell>
                      <TableCell>
                        {assignment.due_date
                          ? formatShortLocaleDate(assignment.due_date, i18n.language, t('common.never'))
                          : t('common.noDueDate')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            {t('common.classLeaderboardTitle')}
          </Typography>

          {loadingLeaderboard ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : leaderboard.leaderboard.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
              <Typography variant="body1" sx={{ color: 'neutral.500' }}>
                {t('common.leaderboardEmptyClass')}
              </Typography>
            </Paper>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.300', mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'neutral.50' }}>
                      <TableCell sx={{ fontWeight: 600, width: 80 }}>{t('common.rank')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('common.studentCol')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        {t('common.pointsCol')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaderboard.leaderboard.map((entry) => (
                      <TableRow
                        key={entry.rank}
                        hover
                        sx={{
                          '&:hover': {
                            bgcolor: 'neutral.50',
                          },
                          ...(entry.rank <= 3 && {
                            bgcolor: entry.rank === 1 ? 'warning.50' : entry.rank === 2 ? 'neutral.50' : 'success.50',
                          }),
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {entry.rank === 1 && <EmojiEvents sx={{ color: 'warning.main', fontSize: 24 }} />}
                            {entry.rank === 2 && <EmojiEvents sx={{ color: 'neutral.500', fontSize: 24 }} />}
                            {entry.rank === 3 && <EmojiEvents sx={{ color: 'success.main', fontSize: 24 }} />}
                            {entry.rank > 3 && (
                              <Typography variant="h6" sx={{ fontWeight: 700, color: 'neutral.600', minWidth: 24 }}>
                                {entry.rank}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {entry.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={t('common.pointsLabel', { count: entry.points })}
                            size="small"
                            sx={{
                              bgcolor: 'primary.50',
                              color: 'primary.main',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {leaderboard.current_user_rank && leaderboard.current_user_rank.rank > 10 && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.main' }}>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {t('common.yourRankLine', {
                      rank: leaderboard.current_user_rank.rank,
                      points: leaderboard.current_user_rank.points,
                    })}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            {t('common.classAnalyticsTitle')}
          </Typography>

          {loadingProgress ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : studentProgress.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
              <Typography variant="body1" sx={{ color: 'neutral.500' }}>
                {t('common.analyticsEmptyClass')}
              </Typography>
            </Paper>
          ) : (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card elevation={0} sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                        {t('analytics.totalStudents')}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700 }}>
                        {students.length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card elevation={0} sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                        {t('analytics.averageMastery')}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700 }}>
                        {studentProgress.length > 0
                          ? Math.round(
                              studentProgress.reduce((sum, p) => sum + p.average_mastery, 0) / studentProgress.length
                            )
                          : 0}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card elevation={0} sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                        {t('analytics.totalAssignments')}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700 }}>
                        {assignments.length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.200' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'neutral.200' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('common.studentPerformanceOverview')}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'neutral.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('common.studentCol')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('common.assignmentsCompleted')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('common.avgMastery')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('progress.colProgress')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentProgress.map((progress) => {
                        const student = students.find((s) => s.id === progress.student_id)
                        return (
                          <TableRow key={progress.student_id} hover>
                            <TableCell>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {student?.name || t('common.unknown')}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                                {student?.email || ''}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {progress.assignments_completed} / {progress.assignments_total}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={progress.average_mastery}
                                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                  color={
                                    progress.average_mastery >= 80
                                      ? 'success'
                                      : progress.average_mastery >= 60
                                      ? 'warning'
                                      : 'error'
                                  }
                                />
                                <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 600 }}>
                                  {progress.average_mastery}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {progress.assignments_total > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(progress.assignments_completed / progress.assignments_total) * 100}
                                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                    color={
                                      progress.assignments_completed === progress.assignments_total
                                        ? 'success'
                                        : progress.assignments_completed > 0
                                        ? 'warning'
                                        : 'error'
                                    }
                                  />
                                  <Typography variant="body2" sx={{ minWidth: 60, fontWeight: 600 }}>
                                    {Math.round((progress.assignments_completed / progress.assignments_total) * 100)}%
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                                  {t('common.noAssignmentsProgress')}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </TabPanel>
      </Paper>

      {/* Add Students Dialog */}
      {classId && (
        <AddStudentsDialog
          open={addStudentsDialogOpen}
          onClose={() => setAddStudentsDialogOpen(false)}
          onSuccess={fetchStudents}
          classId={parseInt(classId)}
          existingStudentIds={students.map((s) => s.id)}
        />
      )}

      {/* Add Assignment Dialog */}
      {classId && (
        <AddAssignmentDialog
          open={addAssignmentDialogOpen}
          onClose={() => setAddAssignmentDialogOpen(false)}
          onSuccess={() => {
            fetchAssignments()
            setAddAssignmentDialogOpen(false)
          }}
          classId={parseInt(classId)}
        />
      )}

      {/* Remove Student Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onClose={handleRemoveCancel}>
        <DialogTitle>{t('common.removeStudent')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('common.removeStudentConfirm', { name: studentToRemove?.name ?? '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveCancel} disabled={removing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleRemoveConfirm}
            variant="contained"
            color="error"
            disabled={removing}
          >
            {removing ? t('common.removing') : t('common.remove')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

