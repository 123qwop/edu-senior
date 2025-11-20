import { useState, useEffect } from 'react'
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
  CircularProgress,
  Alert,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material'
import { createAssignment, getStudySets, type StudySetOut } from '../api/studySetsApi'

interface AddAssignmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  classId: number
}

export default function AddAssignmentDialog({ open, onClose, onSuccess, classId }: AddAssignmentDialogProps) {
  const [studySets, setStudySets] = useState<StudySetOut[]>([])
  const [selectedSetId, setSelectedSetId] = useState<number | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSets, setLoadingSets] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchStudySets()
    }
  }, [open])

  const fetchStudySets = async () => {
    try {
      setLoadingSets(true)
      setError(null)
      // Fetch study sets that the teacher owns or has access to
      const data = await getStudySets({ ownership: 'my_sets' })
      setStudySets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study sets')
    } finally {
      setLoadingSets(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedSetId) {
      setError('Please select a study set')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await createAssignment(classId, {
        set_id: typeof selectedSetId === 'number' ? selectedSetId : parseInt(selectedSetId as string),
        due_date: dueDate || undefined,
      })
      
      // Reset form
      setSelectedSetId('')
      setDueDate('')
      
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setSelectedSetId('')
      setDueDate('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Assignment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Select a study set to assign to this class. Students will be able to work on this assignment.
          </Typography>

          {loadingSets ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth required>
              <InputLabel>Study Set</InputLabel>
              <Select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value as number | '')}
                label="Study Set"
              >
                {studySets.length === 0 ? (
                  <MenuItem disabled>No study sets available. Create one first.</MenuItem>
                ) : (
                  studySets.map((set) => (
                    <MenuItem key={set.id} value={set.id}>
                      {set.title} {set.subject && `(${set.subject})`}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Due Date (Optional)"
            type="datetime-local"
            fullWidth
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
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
          disabled={loading || !selectedSetId || loadingSets}
        >
          {loading ? 'Creating...' : 'Create Assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

