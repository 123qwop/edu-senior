import { useState, useEffect } from 'react'
import { createStudySet, getClasses, type StudySetCreate, type ClassOut } from '../api/studySetsApi'
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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Stack,
  Box,
  Typography,
  Checkbox,
  Autocomplete,
  Chip,
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { isTeacher } from '../api/authApi'

interface CreateStudySetDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void // Callback to refresh the study sets list
}

type StudySetType = 'Flashcards' | 'Quiz' | 'Problem set'
type QuestionType = 'Multiple choice' | 'True/False' | 'Short answer'

export default function CreateStudySetDialog({ open, onClose, onSuccess }: CreateStudySetDialogProps) {
  const isTeacherView = isTeacher()

  // Section 1 - Basic Info
  const [title, setTitle] = useState('')
  const [type, setType] = useState<StudySetType>('Flashcards')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Section 2 - Initial Content
  // Flashcards
  const [flashcardTerm, setFlashcardTerm] = useState('')
  const [flashcardDefinition, setFlashcardDefinition] = useState('')

  // Quiz
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<QuestionType>('Multiple choice')
  const [option1, setOption1] = useState('')
  const [option2, setOption2] = useState('')
  const [option3, setOption3] = useState('')
  const [option4, setOption4] = useState('')
  const [correctOption, setCorrectOption] = useState('1')
  const [trueFalseAnswer, setTrueFalseAnswer] = useState('true')
  const [shortAnswer, setShortAnswer] = useState('')

  // Problem set
  const [problemStatement, setProblemStatement] = useState('')
  const [solution, setSolution] = useState('')

  // Section 3 - Assignment
  const [selectedClass, setSelectedClass] = useState('')
  const [assignToAll, setAssignToAll] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Data - will be loaded from API
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History']
  const levels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'University']
  const [classes, setClasses] = useState<ClassOut[]>([])
  const [students, setStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isTeacherView && open) {
      // Load classes when dialog opens
      getClasses()
        .then(setClasses)
        .catch((err) => {
          console.error('Failed to load classes:', err)
          // Keep empty array on error
        })
    }
  }, [isTeacherView, open])

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!type) {
      newErrors.type = 'Type is required'
    }
    if (!subject) {
      newErrors.subject = 'Subject is required'
    }

    // Validate initial content if any field is filled
    if (type === 'Quiz' && questionText.trim()) {
      if (questionType === 'Multiple choice') {
        if (!option1.trim() || !option2.trim() || !option3.trim() || !option4.trim()) {
          newErrors.quizOptions = 'All 4 options are required for multiple choice'
        }
        if (!correctOption) {
          newErrors.correctOption = 'Please select the correct answer'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) {
      return
    }

    // Build payload
    const payload: any = {
      title: title.trim(),
      type,
      subject,
      level: level || undefined,
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    }

    // Add initial content
    if (type === 'Flashcards' && (flashcardTerm.trim() || flashcardDefinition.trim())) {
      payload.initialItem = {
        term: flashcardTerm.trim(),
        definition: flashcardDefinition.trim(),
      }
    } else if (type === 'Quiz' && questionText.trim()) {
      payload.initialItem = {
        question: questionText.trim(),
        questionType,
        ...(questionType === 'Multiple choice'
          ? {
              options: [option1.trim(), option2.trim(), option3.trim(), option4.trim()],
              correctAnswer: parseInt(correctOption),
            }
          : questionType === 'True/False'
            ? { answer: trueFalseAnswer === 'true' }
            : { answer: shortAnswer.trim() }),
      }
    } else if (type === 'Problem set' && problemStatement.trim()) {
      payload.initialItem = {
        problem: problemStatement.trim(),
        solution: solution.trim() || undefined,
      }
    }

    setLoading(true)
    try {
      const studySetData: StudySetCreate = {
        title: payload.title,
        subject: payload.subject,
        type: payload.type as 'Flashcards' | 'Quiz' | 'Problem set',
        level: payload.level || undefined,
        description: payload.description || undefined,
        tags: payload.tags || [],
        initialItem: payload.initialItem || undefined,
        assignment: selectedClass
          ? {
              classId: parseInt(selectedClass),
              assignToAll,
              studentIds: assignToAll ? undefined : selectedStudents.map((s) => parseInt(s)),
            }
          : undefined,
      }

      const createdSet = await createStudySet(studySetData)

      // Close dialog
      handleClose()
      
      // Show success message
      alert(`Study set "${createdSet.title}" created successfully!`)
      
      // Refresh the study sets list
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to create study set:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create study set. Please try again.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Reset form
    setTitle('')
    setType('Flashcards')
    setSubject('')
    setLevel('')
    setDescription('')
    setTags([])
    setFlashcardTerm('')
    setFlashcardDefinition('')
    setQuestionText('')
    setQuestionType('Multiple choice')
    setOption1('')
    setOption2('')
    setOption3('')
    setOption4('')
    setCorrectOption('1')
    setTrueFalseAnswer('true')
    setShortAnswer('')
    setProblemStatement('')
    setSolution('')
    setSelectedClass('')
    setAssignToAll(false)
    setSelectedStudents([])
    setErrors({})
    onClose()
  }

  const renderInitialContent = () => {
    if (type === 'Flashcards') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
            First item (optional)
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Term"
                value={flashcardTerm}
                onChange={(e) => setFlashcardTerm(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Definition"
                value={flashcardDefinition}
                onChange={(e) => setFlashcardDefinition(e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>
        </Box>
      )
    }

    if (type === 'Quiz') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
            First item (optional)
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Question text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              size="small"
              required={option1.trim() || option2.trim() || option3.trim() || option4.trim()}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Question type</InputLabel>
              <Select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} label="Question type">
                <MenuItem value="Multiple choice">Multiple choice</MenuItem>
                <MenuItem value="True/False">True/False</MenuItem>
                <MenuItem value="Short answer">Short answer</MenuItem>
              </Select>
            </FormControl>

            {questionType === 'Multiple choice' && (
              <Box>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Option 1"
                    value={option1}
                    onChange={(e) => setOption1(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Option 2"
                    value={option2}
                    onChange={(e) => setOption2(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Option 3"
                    value={option3}
                    onChange={(e) => setOption3(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Option 4"
                    value={option4}
                    onChange={(e) => setOption4(e.target.value)}
                    size="small"
                  />
                </Stack>
                <FormControl component="fieldset" sx={{ mt: 2 }}>
                  <FormLabel component="legend">Correct answer</FormLabel>
                  <RadioGroup
                    row
                    value={correctOption}
                    onChange={(e) => setCorrectOption(e.target.value)}
                  >
                    <FormControlLabel value="1" control={<Radio size="small" />} label="Option 1" />
                    <FormControlLabel value="2" control={<Radio size="small" />} label="Option 2" />
                    <FormControlLabel value="3" control={<Radio size="small" />} label="Option 3" />
                    <FormControlLabel value="4" control={<Radio size="small" />} label="Option 4" />
                  </RadioGroup>
                </FormControl>
              </Box>
            )}

            {questionType === 'True/False' && (
              <FormControl component="fieldset">
                <FormLabel component="legend">Correct answer</FormLabel>
                <RadioGroup
                  row
                  value={trueFalseAnswer}
                  onChange={(e) => setTrueFalseAnswer(e.target.value)}
                >
                  <FormControlLabel value="true" control={<Radio size="small" />} label="True" />
                  <FormControlLabel value="false" control={<Radio size="small" />} label="False" />
                </RadioGroup>
              </FormControl>
            )}

            {questionType === 'Short answer' && (
              <TextField
                fullWidth
                label="Expected answer"
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                size="small"
              />
            )}
          </Stack>
        </Box>
      )
    }

    if (type === 'Problem set') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
            First item (optional)
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Problem statement"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              multiline
              rows={4}
              size="small"
            />
            <TextField
              fullWidth
              label="Solution / steps (optional)"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              multiline
              rows={4}
              size="small"
            />
          </Stack>
        </Box>
      )
    }

    return null
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, color: 'neutral.700' }}>Create study set</DialogTitle>
      <DialogContent>
        <Stack spacing={4}>
          {/* Section 1 - Basic Info */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
              Basic info
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                error={!!errors.title}
                helperText={errors.title || 'e.g. Algebra - Quadratic Equations'}
                size="small"
              />

              <FormControl component="fieldset" required error={!!errors.type}>
                <FormLabel component="legend">Type</FormLabel>
                <RadioGroup row value={type} onChange={(e) => setType(e.target.value as StudySetType)}>
                  <FormControlLabel value="Flashcards" control={<Radio size="small" />} label="Flashcards" />
                  <FormControlLabel value="Quiz" control={<Radio size="small" />} label="Quiz" />
                  <FormControlLabel value="Problem set" control={<Radio size="small" />} label="Problem set" />
                </RadioGroup>
              </FormControl>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small" required error={!!errors.subject}>
                    <InputLabel>Subject</InputLabel>
                    <Select value={subject} onChange={(e) => setSubject(e.target.value)} label="Subject">
                      {subjects.map((sub) => (
                        <MenuItem key={sub} value={sub}>
                          {sub}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Level</InputLabel>
                    <Select value={level} onChange={(e) => setLevel(e.target.value)} label="Level">
                      <MenuItem value="">None</MenuItem>
                      {levels.map((lvl) => (
                        <MenuItem key={lvl} value={lvl}>
                          {lvl}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Short description / instructions (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                helperText="Students will practice factoring quadratics and solving using formula."
                size="small"
              />

              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={tags}
                onChange={(_, newValue) => setTags(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} size="small" />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Tags (optional)" placeholder="e.g. exam prep, homework" size="small" />
                )}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Section 2 - Initial Content */}
          {renderInitialContent()}

          {/* Section 3 - Assignment (only for teachers) */}
          {isTeacherView && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
                  Assign now (optional)
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Class</InputLabel>
                    <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} label="Class">
                      <MenuItem value="">None</MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id.toString()}>
                          {cls.class_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedClass && (
                    <>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={assignToAll}
                            onChange={(e) => setAssignToAll(e.target.checked)}
                            size="small"
                          />
                        }
                        label="Assign to all students in this class"
                      />

                      {!assignToAll && (
                        <Autocomplete
                          multiple
                          options={students}
                          value={selectedStudents}
                          onChange={(_, newValue) => setSelectedStudents(newValue)}
                          renderInput={(params) => (
                            <TextField {...params} label="Specific students" size="small" />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip variant="outlined" label={option} {...getTagProps({ index })} size="small" />
                            ))
                          }
                        />
                      )}
                    </>
                  )}

                  <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                    You can also assign this set later from the Study set details page.
                  </Typography>
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} sx={{ color: 'neutral.700' }} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleCreate} variant="contained" sx={{ bgcolor: 'primary.main' }} disabled={loading}>
          {loading ? 'Creating...' : 'Create set'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

