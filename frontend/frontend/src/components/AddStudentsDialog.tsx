import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  CircularProgress,
  Typography,
  InputAdornment,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { searchUsers, addStudentsToClass, type Student } from '../api/studySetsApi'

interface AddStudentsDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  classId: number
  existingStudentIds: number[]
}

export default function AddStudentsDialog({
  open,
  onClose,
  onSuccess,
  classId,
  existingStudentIds,
}: AddStudentsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedStudents([])
      setError(null)
    }
  }, [open])

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch()
      } else {
        setSearchResults([])
      }
    }, 500) // Debounce search

    return () => clearTimeout(searchTimeout)
  }, [searchQuery])

  const performSearch = async () => {
    try {
      setSearching(true)
      setError(null)
      const results = await searchUsers(searchQuery.trim())
      // Filter out already enrolled students
      const filtered = results.filter((student) => !existingStudentIds.includes(student.id))
      setSearchResults(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleToggleStudent = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await addStudentsToClass(classId, selectedStudents)
      
      if (result.errors.length > 0) {
        setError(result.errors.join(', '))
      }
      
      if (result.added.length > 0) {
        onSuccess()
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add students')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedStudents([])
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Students</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'neutral.500' }} />
                </InputAdornment>
              ),
              endAdornment: searching && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ),
            }}
          />

          {error && (
            <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>
              {error}
            </Box>
          )}

          {searchQuery.trim().length < 2 && (
            <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
              Type at least 2 characters to search for students
            </Typography>
          )}

          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
            <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
              No students found. Try a different search term.
            </Typography>
          )}

          {searchResults.length > 0 && (
            <Box sx={{ border: '1px solid', borderColor: 'neutral.300', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {searchResults.map((student) => (
                  <ListItem
                    key={student.id}
                    disablePadding
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleToggleStudent(student.id)}
                      />
                    }
                  >
                    <ListItemButton onClick={() => handleToggleStudent(student.id)}>
                      <ListItemText
                        primary={student.name}
                        secondary={student.email}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {selectedStudents.length > 0 && (
            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
              {selectedStudents.length} student(s) selected
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selectedStudents.length === 0}
        >
          {loading ? 'Adding...' : `Add ${selectedStudents.length > 0 ? `${selectedStudents.length} ` : ''}Student(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

