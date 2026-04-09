import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  updateStudySet,
  getStudySetAssignmentsForTeacher,
  patchStudySetAssignment,
  type StudySetUpdate,
  type StudySetOut,
  type StudySetAssignmentTeacherRow,
} from '../api/studySetsApi'
import { isTeacher } from '../api/authApi'
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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Divider,
  CircularProgress,
  Stack,
  InputAdornment,
} from '@mui/material'

type ListVisibility = 'public' | 'private'

interface EditStudySetDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  studySet: StudySetOut | null
}

type StudySetType = 'Flashcards' | 'Quiz' | 'Problem set'

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local → API: empty clears; add seconds if missing for Python fromisoformat */
function datetimeLocalToApiDue(value: string): string | null {
  const t = value.trim()
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) return `${t}:00`
  return t
}

function parseTimeLimitField(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const n = parseInt(s, 10)
  if (Number.isNaN(n) || n < 1 || n > 24 * 60) return null
  return n
}

export default function EditStudySetDialog({ open, onClose, onSuccess, studySet }: EditStudySetDialogProps) {
  const { t } = useTranslation()
  const tDlg = (key: string) => t(`studySets.createDialog.${key}`)
  const teacher = isTeacher()

  // Form state
  const [title, setTitle] = useState('')
  const [type, setType] = useState<StudySetType>('Flashcards')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [listVisibility, setListVisibility] = useState<ListVisibility>('private')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assignmentRows, setAssignmentRows] = useState<StudySetAssignmentTeacherRow[]>([])
  const [assignmentForm, setAssignmentForm] = useState<
    Record<number, { due: string; timeLimit: string }>
  >({})
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  // Populate form when studySet changes
  useEffect(() => {
    if (studySet) {
      setTitle(studySet.title || '')
      setType((studySet.type as StudySetType) || 'Flashcards')
      setSubject(studySet.subject || '')
      setLevel(studySet.level || '')
      setDescription(studySet.description || '')
      setTags(studySet.tags || [])
      setListVisibility(studySet.is_public ? 'public' : 'private')
    }
  }, [studySet])

  useEffect(() => {
    if (!open || !studySet || !teacher || !studySet.is_assigned) {
      setAssignmentRows([])
      setAssignmentForm({})
      setAssignmentError(null)
      return
    }
    let cancelled = false
    setAssignmentLoading(true)
    setAssignmentError(null)
    getStudySetAssignmentsForTeacher(studySet.id)
      .then((rows) => {
        if (cancelled) return
        setAssignmentRows(rows)
        const next: Record<number, { due: string; timeLimit: string }> = {}
        for (const r of rows) {
          next[r.assignment_id] = {
            due: isoToDatetimeLocalValue(r.due_date),
            timeLimit: r.time_limit_minutes != null ? String(r.time_limit_minutes) : '',
          }
        }
        setAssignmentForm(next)
      })
      .catch((e) => {
        if (!cancelled) {
          setAssignmentError(e instanceof Error ? e.message : 'Failed to load assignments')
        }
      })
      .finally(() => {
        if (!cancelled) setAssignmentLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, studySet?.id, studySet?.is_assigned, teacher])

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
        is_public: listVisibility === 'public',
      }

      await updateStudySet(studySet.id, data)

      if (teacher && studySet.is_assigned && assignmentRows.length > 0) {
        for (const row of assignmentRows) {
          const form = assignmentForm[row.assignment_id]
          if (!form) continue
          await patchStudySetAssignment(row.assignment_id, {
            due_date: datetimeLocalToApiDue(form.due),
            time_limit_minutes: parseTimeLimitField(form.timeLimit),
          })
        }
      }

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

          <FormControl component="fieldset">
            <FormLabel component="legend">{tDlg('visibilityLabel')}</FormLabel>
            <RadioGroup
              row
              value={listVisibility}
              onChange={(_, v) => setListVisibility(v as ListVisibility)}
            >
              <FormControlLabel value="private" control={<Radio size="small" />} label={tDlg('visibilityPrivate')} />
              <FormControlLabel value="public" control={<Radio size="small" />} label={tDlg('visibilityPublic')} />
            </RadioGroup>
          </FormControl>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {listVisibility === 'public' ? tDlg('visibilityHelpPublic') : tDlg('visibilityHelpPrivate')}
          </Typography>

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
                <Chip variant="outlined" label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Tags" placeholder="Add tags" />}
          />

          {teacher && studySet?.is_assigned ? (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 1 }}>
                  {tDlg('assignSectionTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {t('studySets.editDialogAssignmentHint')}
                </Typography>
                {assignmentLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : null}
                {assignmentError ? (
                  <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                    {assignmentError}
                  </Typography>
                ) : null}
                {!assignmentLoading && assignmentRows.length === 0 && !assignmentError ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('studySets.editDialogNoClassAssignments')}
                  </Typography>
                ) : null}
                <Stack spacing={2}>
                  {assignmentRows.map((row) => {
                    const form = assignmentForm[row.assignment_id] ?? { due: '', timeLimit: '' }
                    return (
                      <Box
                        key={row.assignment_id}
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'neutral.50',
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          {row.class_name}
                        </Typography>
                        <TextField
                          fullWidth
                          label={tDlg('dueDateLabel')}
                          type="datetime-local"
                          value={form.due}
                          onChange={(e) =>
                            setAssignmentForm((prev) => ({
                              ...prev,
                              [row.assignment_id]: {
                                ...form,
                                due: e.target.value,
                              },
                            }))
                          }
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          helperText={tDlg('dueDateHelper')}
                          sx={{ mb: 1.5 }}
                        />
                        <TextField
                          fullWidth
                          label={tDlg('timeLimitLabel')}
                          type="number"
                          inputProps={{ min: 1, max: 1440 }}
                          value={form.timeLimit}
                          onChange={(e) =>
                            setAssignmentForm((prev) => ({
                              ...prev,
                              [row.assignment_id]: {
                                ...form,
                                timeLimit: e.target.value,
                              },
                            }))
                          }
                          size="small"
                          placeholder="30"
                          helperText={tDlg('timeLimitHelper')}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">{t('common.minutesAbbr')}</InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
            </>
          ) : null}

          {error ? (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
