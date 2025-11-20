import { Box, Typography, Paper, Tabs, Tab, Chip, CircularProgress, Alert, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { getClasses, getClassStudents, removeStudentFromClass, getClassAssignments, type ClassOut, type Student, type Assignment } from '../api/studySetsApi'
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

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
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
  const { classId } = useParams<{ classId: string }>()
  const [currentTab, setCurrentTab] = useState(() => {
    // Check if we're coming from Classes page with tab state
    const state = window.history.state
    return state?.tab ?? 0
  })
  const [classData, setClassData] = useState<ClassOut | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addStudentsDialogOpen, setAddStudentsDialogOpen] = useState(false)
  const [addAssignmentDialogOpen, setAddAssignmentDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    fetchClassData()
  }, [classId])

  useEffect(() => {
    if (classId && currentTab === 0) {
      fetchStudents()
    }
    if (classId && currentTab === 1) {
      fetchAssignments()
    }
  }, [classId, currentTab])

  const fetchClassData = async () => {
    if (!classId) {
      setError('Class ID is missing')
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
        setError('Class not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class')
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
      alert(err instanceof Error ? err.message : 'Failed to remove student')
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
        <Alert severity="error">{error || 'Class not found'}</Alert>
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
          <Typography variant="body2">Back to Classes</Typography>
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
                  label={classData.subject}
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
                  label={classData.level}
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
            label="Students"
            id="class-tab-0"
            aria-controls="class-tabpanel-0"
          />
          <Tab
            icon={<AssignmentIcon />}
            iconPosition="start"
            label="Assignments"
            id="class-tab-1"
            aria-controls="class-tabpanel-1"
          />
          <Tab
            icon={<EmojiEventsIcon />}
            iconPosition="start"
            label="Leaderboard"
            id="class-tab-2"
            aria-controls="class-tabpanel-2"
          />
          <Tab
            icon={<AnalyticsIcon />}
            iconPosition="start"
            label="Analytics"
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
                Students ({students.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddStudentsDialogOpen(true)}
                sx={{ bgcolor: 'primary.main' }}
              >
                Add Students
              </Button>
            </Box>
          )}

          {loadingStudents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
              <Typography variant="body1" sx={{ color: 'neutral.500', mb: 2 }}>
                No students enrolled yet.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddStudentsDialogOpen(true)}
              >
                Add Students
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.300' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'neutral.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
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
                      <TableCell>
                        <Chip
                          label="Enrolled"
                          size="small"
                          sx={{
                            bgcolor: 'success.50',
                            color: 'success.main',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveClick(student)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Assignments / Study Sets
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddAssignmentDialogOpen(true)}
              sx={{ bgcolor: 'primary.main' }}
            >
              Add Assignment
            </Button>
          </Box>

          {loadingAssignments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : assignments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
              <Typography variant="body1" sx={{ color: 'neutral.500', mb: 2 }}>
                No assignments yet. Create an assignment to get started.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.300' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'neutral.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Study Set</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
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
                            label={assignment.subject}
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
                          ? new Date(assignment.due_date).toLocaleDateString()
                          : 'No due date'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Leaderboard / Gamification
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            Class leaderboard and gamification features will be displayed here. This section will show:
            <ul>
              <li>Student rankings</li>
              <li>Points and achievements</li>
              <li>Progress streaks</li>
            </ul>
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Analytics
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            Class analytics and summary statistics will be displayed here. This section will show:
            <ul>
              <li>Average accuracy across assignments</li>
              <li>Class activity trends</li>
              <li>Progress over time</li>
            </ul>
          </Typography>
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
        <DialogTitle>Remove Student</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove <strong>{studentToRemove?.name}</strong> from this class? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveCancel} disabled={removing}>
            Cancel
          </Button>
          <Button
            onClick={handleRemoveConfirm}
            variant="contained"
            color="error"
            disabled={removing}
          >
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

