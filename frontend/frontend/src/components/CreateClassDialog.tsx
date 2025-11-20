import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { createClass, type ClassCreate } from '../api/studySetsApi'

interface CreateClassDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
const levels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

export default function CreateClassDialog({ open, onClose, onSuccess }: CreateClassDialogProps) {
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Validation
    if (!className.trim()) {
      setError('Class name is required')
      return
    }
    if (!subject) {
      setError('Subject is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data: ClassCreate = {
        class_name: className.trim(),
        subject,
        level: level || undefined,
        description: description.trim() || undefined,
      }

      await createClass(data)
      
      // Reset form
      setClassName('')
      setSubject('')
      setLevel('')
      setDescription('')
      
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setClassName('')
      setSubject('')
      setLevel('')
      setDescription('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Class</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label="Class Name"
            required
            fullWidth
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g., Math 101"
          />

          <FormControl fullWidth required>
            <InputLabel>Subject</InputLabel>
            <Select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              label="Subject"
            >
              {subjects.map((sub) => (
                <MenuItem key={sub} value={sub}>
                  {sub}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Level / Grade</InputLabel>
            <Select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              label="Level / Grade"
            >
              <MenuItem value="">None</MenuItem>
              {levels.map((lvl) => (
                <MenuItem key={lvl} value={lvl}>
                  {lvl}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this class"
          />

          {error && (
            <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>
              {error}
            </Box>
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
          disabled={loading || !className.trim() || !subject}
        >
          {loading ? 'Creating...' : 'Create Class'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

