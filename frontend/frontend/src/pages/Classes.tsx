import { Box, Typography, Paper, Chip, CircularProgress, Alert, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Menu, MenuItem, FormControl, InputLabel, Select, InputAdornment, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material'
import Grid from '@mui/material/Grid'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { getClasses, deleteClass, type ClassOut } from '../api/studySetsApi'
import { getUserRole } from '../api/authApi'
import ClassIcon from '@mui/icons-material/Class'
import PeopleIcon from '@mui/icons-material/People'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CreateClassDialog from '../components/CreateClassDialog'
import EditClassDialog from '../components/EditClassDialog'
import AddAssignmentDialog from '../components/AddAssignmentDialog'

const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
const levels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

export default function Classes() {
  const [classes, setClasses] = useState<ClassOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedClassForEdit, setSelectedClassForEdit] = useState<ClassOut | null>(null)
  const [addAssignmentDialogOpen, setAddAssignmentDialogOpen] = useState(false)
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState<number | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const userRole = getUserRole()
  const isTeacher = userRole === 'teacher'
  const navigate = useNavigate()

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getClasses()
      setClasses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, classId: number) => {
    setAnchorEl(event.currentTarget)
    setSelectedClassId(classId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedClassId(null)
  }

  const handleViewClass = (classId: number) => {
    navigate(`/dashboard/classes/${classId}`)
    handleMenuClose()
  }

  const handleAddAssignment = (classId: number) => {
    setSelectedClassForAssignment(classId)
    setAddAssignmentDialogOpen(true)
    handleMenuClose()
  }

  const handleEditClass = () => {
    if (selectedClassId) {
      const classToEdit = classes.find((c) => c.id === selectedClassId)
      if (classToEdit) {
        setSelectedClassForEdit(classToEdit)
        setEditDialogOpen(true)
      }
    }
    handleMenuClose()
  }

  const handleArchiveClass = () => {
    if (selectedClassId) {
      setDeleteDialogOpen(true)
    }
    setAnchorEl(null)
  }

  const handleDeleteDialogClose = () => {
    if (deleting) return
    setDeleteDialogOpen(false)
    setSelectedClassId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedClassId) return

    try {
      setDeleting(true)
      await deleteClass(selectedClassId)
      setDeleteDialogOpen(false)
      setSelectedClassId(null)
      fetchClasses()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete class')
    } finally {
      setDeleting(false)
    }
  }

  // Filter classes
  const filteredClasses = classes.filter((classItem) => {
    const matchesSearch = !searchQuery || 
      classItem.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (classItem.subject && classItem.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesSubject = !selectedSubject || classItem.subject === selectedSubject
    const matchesLevel = !selectedLevel || classItem.level === selectedLevel

    return matchesSearch && matchesSubject && matchesLevel
  })

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

  // Student view (simpler card layout)
  if (!isTeacher) {
    return (
      <Box sx={{ py: 4, flexGrow: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
          My Classes
        </Typography>

        {classes.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: 'neutral.500' }}>
              You're not enrolled in any classes yet.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {classes.map((classItem) => (
              <Grid key={classItem.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  component={RouterLink}
                  to={`/dashboard/classes/${classItem.id}`}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 4,
                    },
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ClassIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                      {classItem.class_name}
                    </Typography>
                  </Box>

                  {classItem.subject && (
                    <Chip
                      label={classItem.subject}
                      size="small"
                      sx={{
                        mb: 2,
                        bgcolor: 'primary.50',
                        color: 'primary.main',
                        fontWeight: 500,
                      }}
                    />
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 2 }}>
                    <PeopleIcon sx={{ mr: 1, fontSize: 18, color: 'neutral.500' }} />
                    <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                      Enrolled
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    )
  }

  // Teacher view (table with search and filters)
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        My Classes
      </Typography>

      {/* Toolbar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'neutral.50', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'neutral.500' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Subject Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                label="Subject"
              >
                <MenuItem value="">All Subjects</MenuItem>
                {subjects.map((sub) => (
                  <MenuItem key={sub} value={sub}>
                    {sub}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Level Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Level</InputLabel>
              <Select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                label="Level"
              >
                <MenuItem value="">All Levels</MenuItem>
                {levels.map((lvl) => (
                  <MenuItem key={lvl} value={lvl}>
                    {lvl}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Create Button */}
          <Grid size={{ xs: 12, md: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              fullWidth
              onClick={() => setCreateDialogOpen(true)}
              sx={{ bgcolor: 'primary.main' }}
            >
              Create Class
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Classes Table */}
      {filteredClasses.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: 'neutral.500' }}>
            {classes.length === 0
              ? "You haven't created any classes yet. Create a class to get started."
              : 'No classes match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'neutral.300' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'neutral.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Class Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Level / Grade</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Active Assignments</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Average Mastery</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClasses.map((classItem) => (
                <TableRow
                  key={classItem.id}
                  hover
                  sx={{
                    '&:hover': {
                      bgcolor: 'neutral.50',
                    },
                  }}
                >
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/dashboard/classes/${classItem.id}`}
                      sx={{
                        textTransform: 'none',
                        color: 'primary.main',
                        fontWeight: 600,
                        textAlign: 'left',
                        p: 0,
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {classItem.class_name}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {classItem.subject || (
                      <Typography variant="body2" sx={{ color: 'neutral.400' }}>
                        Not set
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {classItem.level || (
                      <Typography variant="body2" sx={{ color: 'neutral.400' }}>
                        Not set
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{classItem.student_count || 0}</TableCell>
                  <TableCell>{classItem.assignment_count || 0}</TableCell>
                  <TableCell>
                    {classItem.average_mastery !== null ? (
                      `${Math.round(classItem.average_mastery)}%`
                    ) : (
                      <Typography variant="body2" sx={{ color: 'neutral.400' }}>
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewClass(classItem.id)}
                        sx={{ color: 'primary.main' }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleAddAssignment(classItem.id)}
                        sx={{ color: 'primary.main' }}
                      >
                        <AssignmentIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, classItem.id)}
                        sx={{ color: 'neutral.500' }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* More Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedClassId && handleViewClass(selectedClassId)}>
          View Class Details
        </MenuItem>
        <MenuItem onClick={() => selectedClassId && handleAddAssignment(selectedClassId)}>
          Add Assignment
        </MenuItem>
        <MenuItem onClick={handleEditClass}>Edit Class</MenuItem>
        <MenuItem onClick={handleArchiveClass} sx={{ color: 'error.main' }}>
          Delete Class
        </MenuItem>
      </Menu>

      {/* Create Class Dialog */}
      <CreateClassDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchClasses}
      />

      {/* Edit Class Dialog */}
      <EditClassDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setSelectedClassForEdit(null)
        }}
        onSuccess={() => {
          fetchClasses()
          setEditDialogOpen(false)
          setSelectedClassForEdit(null)
        }}
        classData={selectedClassForEdit}
      />

      {/* Add Assignment Dialog */}
      {selectedClassForAssignment && (
        <AddAssignmentDialog
          open={addAssignmentDialogOpen}
          onClose={() => {
            setAddAssignmentDialogOpen(false)
            setSelectedClassForAssignment(null)
          }}
          onSuccess={() => {
            setAddAssignmentDialogOpen(false)
            navigate(`/dashboard/classes/${selectedClassForAssignment}`, { state: { tab: 1 } })
            setSelectedClassForAssignment(null)
          }}
          classId={selectedClassForAssignment}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete Class</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this class? This action cannot be undone. All students will be removed from the class and all assignments will be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
