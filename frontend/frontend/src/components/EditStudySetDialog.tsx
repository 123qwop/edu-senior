import { useState, useEffect } from 'react'
import { updateStudySet, type StudySetUpdate, type StudySetOut } from '../api/studySetsApi'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Autocomplete,
  Chip,
} from '@mui/material'
import { isTeacher } from '../api/authApi'

interface EditStudySetDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  studySet: StudySetOut | null
}

type StudySetType = 'Flashcards' | 'Quiz' | 'Problem set'

export default function EditStudySetDialog({ open, onClose, onSuccess, studySet }: EditStudySetDialogProps) {
  const isTeacherView = isTeacher()

  // Form state
  const [title, setTitle] = useState('')
  const [type, setType] = useState<StudySetType>('Flashcards')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate form when studySet changes
  useEffect(() => {
    if (studySet) {
      setTitle(studySet.title || '')
      setType((studySet.type as StudySetType) || 'Flashcards')
      setSubject(studySet.subject || '')
      setLevel(studySet.level || '')
      setDescription(studySet.description || '')
      setTags(studySet.tags || [])
    }
  }, [studySet])

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
  const levels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'University']

  const handleSubmit = async () => {
    if (!studySet) return

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!subject) {
      setError('Subject is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data: StudySetUpdate = {
        title: title.trim(),
        subject,
        type,
        level: level || undefined,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      }

      await updateStudySet(studySet.id, data)
      
      // Reset form
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update study set')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Study Set</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label="Title"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Calculus Basics"
          />

          <FormControl fullWidth required>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as StudySetType)}
              label="Type"
            >
              <MenuItem value="Flashcards">Flashcards</MenuItem>
              <MenuItem value="Quiz">Quiz</MenuItem>
              <MenuItem value="Problem set">Problem set</MenuItem>
            </Select>
          </FormControl>

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
            <InputLabel>Level</InputLabel>
            <Select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              label="Level"
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
            placeholder="Optional description"
          />

          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            onChange={(_, newValue) => {
              setTags(newValue)
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  key={index}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Add tags (press Enter)"
              />
            )}
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
          disabled={loading || !title.trim() || !subject}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

