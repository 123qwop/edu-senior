import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { isTeacher } from '../api/authApi'
import MathTypingHelp from './MathTypingHelp'

interface CreateStudySetDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void // Callback to refresh the study sets list
}

type StudySetType = 'Flashcards' | 'Quiz' | 'Problem set'
type QuestionType = 'Multiple choice' | 'True/False' | 'Short answer'
type ListVisibility = 'public' | 'private'

const SUBJECT_I18N: Record<string, string> = {
  Mathematics: 'studySets.subjectMathematics',
  Physics: 'studySets.subjectPhysics',
  Chemistry: 'studySets.subjectChemistry',
  Biology: 'studySets.subjectBiology',
  English: 'studySets.subjectEnglish',
  History: 'studySets.subjectHistory',
}

const LEVEL_I18N: Record<string, string> = {
  'Grade 7': 'classes.levelGrade7',
  'Grade 8': 'classes.levelGrade8',
  'Grade 9': 'classes.levelGrade9',
  'Grade 10': 'classes.levelGrade10',
  'Grade 11': 'classes.levelGrade11',
  'Grade 12': 'classes.levelGrade12',
  University: 'classes.levelUniversity',
}

export default function CreateStudySetDialog({ open, onClose, onSuccess }: CreateStudySetDialogProps) {
  const { t } = useTranslation()
  const isTeacherView = isTeacher()
  const tDlg = (key: string, options?: Record<string, unknown>) => t(`studySets.createDialog.${key}`, options)

  // Section 1 - Basic Info
  const [title, setTitle] = useState('')
  const [type, setType] = useState<StudySetType>('Flashcards')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [listVisibility, setListVisibility] = useState<ListVisibility>('private')

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
  const [assignmentDueDate, setAssignmentDueDate] = useState('')
  const [assignmentTimeLimit, setAssignmentTimeLimit] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Data - will be loaded from API
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History']
  const levels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'University']
  const [classes, setClasses] = useState<ClassOut[]>([])
  const [students] = useState<string[]>([])
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
      newErrors.title = tDlg('errTitleRequired')
    }
    if (!type) {
      newErrors.type = tDlg('errTypeRequired')
    }
    if (!subject) {
      newErrors.subject = tDlg('errSubjectRequired')
    }

    // Validate initial content if any field is filled
    if (type === 'Quiz' && questionText.trim()) {
      if (questionType === 'Multiple choice') {
        if (!option1.trim() || !option2.trim() || !option3.trim() || !option4.trim()) {
          newErrors.quizOptions = tDlg('errQuizOptionsAll')
        }
        if (!correctOption) {
          newErrors.correctOption = tDlg('errSelectCorrect')
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
        is_public: listVisibility === 'public',
        initialItem: payload.initialItem || undefined,
        assignment: selectedClass
          ? {
              classId: parseInt(selectedClass, 10),
              assignToAll,
              studentIds: assignToAll ? undefined : selectedStudents.map((s) => parseInt(s, 10)),
              dueDate: assignmentDueDate.trim() || undefined,
              timeLimitMinutes: (() => {
                if (!assignmentTimeLimit.trim()) return undefined
                const n = parseInt(assignmentTimeLimit.trim(), 10)
                if (Number.isNaN(n) || n < 1 || n > 1440) return undefined
                return n
              })(),
            }
          : undefined,
      }

      const createdSet = await createStudySet(studySetData)

      // Close dialog
      handleClose()

      // Show success message
      alert(tDlg('successCreated', { title: createdSet.title }))
      
      // Refresh the study sets list
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to create study set:', error)
      const errorMessage = error instanceof Error ? error.message : tDlg('createFailedGeneric')
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
    setListVisibility('private')
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
    setAssignmentDueDate('')
    setAssignmentTimeLimit('')
    setErrors({})
    onClose()
  }

  const renderInitialContent = () => {
    if (type === 'Flashcards') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
            {tDlg('firstItemOptional')}
          </Typography>
          <MathTypingHelp />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={tDlg('termLabel')}
                value={flashcardTerm}
                onChange={(e) => setFlashcardTerm(e.target.value)}
                size="small"
                helperText={t('studySets.mathFieldHint')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={tDlg('definitionLabel')}
                value={flashcardDefinition}
                onChange={(e) => setFlashcardDefinition(e.target.value)}
                size="small"
                helperText={t('studySets.mathFieldHint')}
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
            {tDlg('firstItemOptional')}
          </Typography>
          <MathTypingHelp />
          <Stack spacing={2}>
            <TextField
              fullWidth
              label={tDlg('questionTextLabel')}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              size="small"
              required={Boolean(option1.trim() || option2.trim() || option3.trim() || option4.trim())}
              helperText={t('studySets.mathFieldHint')}
            />
            <FormControl fullWidth size="small">
              <InputLabel>{tDlg('questionTypeLabel')}</InputLabel>
              <Select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                label={tDlg('questionTypeLabel')}
              >
                <MenuItem value="Multiple choice">{tDlg('questionTypeMultipleChoice')}</MenuItem>
                <MenuItem value="True/False">{tDlg('questionTypeTrueFalse')}</MenuItem>
                <MenuItem value="Short answer">{tDlg('questionTypeShortAnswer')}</MenuItem>
              </Select>
            </FormControl>

            {questionType === 'Multiple choice' && (
              <Box>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label={tDlg('optionLabel', { n: 1 })}
                    value={option1}
                    onChange={(e) => setOption1(e.target.value)}
                    size="small"
                    helperText={t('studySets.mathFieldHint')}
                  />
                  <TextField
                    fullWidth
                    label={tDlg('optionLabel', { n: 2 })}
                    value={option2}
                    onChange={(e) => setOption2(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label={tDlg('optionLabel', { n: 3 })}
                    value={option3}
                    onChange={(e) => setOption3(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label={tDlg('optionLabel', { n: 4 })}
                    value={option4}
                    onChange={(e) => setOption4(e.target.value)}
                    size="small"
                  />
                </Stack>
                <FormControl component="fieldset" sx={{ mt: 2 }}>
                  <FormLabel component="legend">{tDlg('correctAnswerLegend')}</FormLabel>
                  <RadioGroup
                    row
                    value={correctOption}
                    onChange={(e) => setCorrectOption(e.target.value)}
                  >
                    <FormControlLabel
                      value="1"
                      control={<Radio size="small" />}
                      label={tDlg('optionLabel', { n: 1 })}
                    />
                    <FormControlLabel
                      value="2"
                      control={<Radio size="small" />}
                      label={tDlg('optionLabel', { n: 2 })}
                    />
                    <FormControlLabel
                      value="3"
                      control={<Radio size="small" />}
                      label={tDlg('optionLabel', { n: 3 })}
                    />
                    <FormControlLabel
                      value="4"
                      control={<Radio size="small" />}
                      label={tDlg('optionLabel', { n: 4 })}
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            )}

            {questionType === 'True/False' && (
              <FormControl component="fieldset">
                <FormLabel component="legend">{tDlg('correctAnswerLegend')}</FormLabel>
                <RadioGroup
                  row
                  value={trueFalseAnswer}
                  onChange={(e) => setTrueFalseAnswer(e.target.value)}
                >
                  <FormControlLabel value="true" control={<Radio size="small" />} label={tDlg('trueChoice')} />
                  <FormControlLabel value="false" control={<Radio size="small" />} label={tDlg('falseChoice')} />
                </RadioGroup>
              </FormControl>
            )}

            {questionType === 'Short answer' && (
              <TextField
                fullWidth
                label={tDlg('expectedAnswerLabel')}
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                size="small"
                helperText={t('studySets.mathFieldHint')}
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
            {tDlg('firstItemOptional')}
          </Typography>
          <MathTypingHelp />
          <Stack spacing={2}>
            <TextField
              fullWidth
              label={tDlg('problemStatementLabel')}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              multiline
              rows={4}
              size="small"
              helperText={t('studySets.mathFieldHint')}
            />
            <TextField
              fullWidth
              label={tDlg('solutionOptionalLabel')}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              multiline
              rows={4}
              size="small"
              helperText={t('studySets.mathFieldHint')}
            />
          </Stack>
        </Box>
      )
    }

    return null
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, color: 'neutral.700' }}>{tDlg('title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={4}>
          {/* Section 1 - Basic Info */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 2 }}>
              {tDlg('basicInfo')}
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label={tDlg('titleLabel')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                error={!!errors.title}
                helperText={errors.title || tDlg('titleHelper')}
                size="small"
              />

              <FormControl component="fieldset" required error={!!errors.type}>
                <FormLabel component="legend">{t('studySets.type')}</FormLabel>
                <RadioGroup row value={type} onChange={(e) => setType(e.target.value as StudySetType)}>
                  <FormControlLabel
                    value="Flashcards"
                    control={<Radio size="small" />}
                    label={t('studySets.typeFlashcards')}
                  />
                  <FormControlLabel value="Quiz" control={<Radio size="small" />} label={t('studySets.typeQuiz')} />
                  <FormControlLabel
                    value="Problem set"
                    control={<Radio size="small" />}
                    label={t('studySets.typeProblemSet')}
                  />
                </RadioGroup>
              </FormControl>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small" required error={!!errors.subject}>
                    <InputLabel>{t('studySets.subject')}</InputLabel>
                    <Select value={subject} onChange={(e) => setSubject(e.target.value)} label={t('studySets.subject')}>
                      {subjects.map((sub) => (
                        <MenuItem key={sub} value={sub}>
                          {t(SUBJECT_I18N[sub])}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('classes.level')}</InputLabel>
                    <Select value={level} onChange={(e) => setLevel(e.target.value)} label={t('classes.level')}>
                      <MenuItem value="">{tDlg('none')}</MenuItem>
                      {levels.map((lvl) => (
                        <MenuItem key={lvl} value={lvl}>
                          {t(LEVEL_I18N[lvl])}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label={tDlg('descriptionLabel')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                helperText={tDlg('descriptionHelper')}
                size="small"
              />

              <FormControl component="fieldset">
                <FormLabel component="legend">{tDlg('visibilityLabel')}</FormLabel>
                <RadioGroup
                  row
                  value={listVisibility}
                  onChange={(_, v) => setListVisibility(v as ListVisibility)}
                >
                  <FormControlLabel
                    value="private"
                    control={<Radio size="small" />}
                    label={tDlg('visibilityPrivate')}
                  />
                  <FormControlLabel
                    value="public"
                    control={<Radio size="small" />}
                    label={tDlg('visibilityPublic')}
                  />
                </RadioGroup>
              </FormControl>

              <Typography variant="caption" sx={{ color: 'neutral.500' }}>
                {listVisibility === 'public' ? tDlg('visibilityHelpPublic') : tDlg('visibilityHelpPrivate')}
              </Typography>

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
                  <TextField {...params} label={tDlg('tagsLabel')} placeholder={tDlg('tagsPlaceholder')} size="small" />
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
                  {tDlg('assignSectionTitle')}
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{tDlg('classLabel')}</InputLabel>
                    <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} label={tDlg('classLabel')}>
                      <MenuItem value="">{tDlg('none')}</MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id.toString()}>
                          {cls.class_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedClass && (
                    <>
                      <TextField
                        fullWidth
                        label={tDlg('dueDateLabel')}
                        type="datetime-local"
                        value={assignmentDueDate}
                        onChange={(e) => setAssignmentDueDate(e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        helperText={tDlg('dueDateHelper')}
                      />
                      <TextField
                        fullWidth
                        label={tDlg('timeLimitLabel')}
                        type="number"
                        inputProps={{ min: 1, max: 1440 }}
                        value={assignmentTimeLimit}
                        onChange={(e) => setAssignmentTimeLimit(e.target.value)}
                        size="small"
                        placeholder="30"
                        helperText={tDlg('timeLimitHelper')}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">{t('common.minutesAbbr')}</InputAdornment>
                          ),
                        }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={assignToAll}
                            onChange={(e) => setAssignToAll(e.target.checked)}
                            size="small"
                          />
                        }
                        label={tDlg('assignToAllStudents')}
                      />

                      {!assignToAll && (
                        <Autocomplete
                          multiple
                          options={students}
                          value={selectedStudents}
                          onChange={(_, newValue) => setSelectedStudents(newValue)}
                          renderInput={(params) => (
                            <TextField {...params} label={tDlg('specificStudentsLabel')} size="small" />
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
                    {tDlg('assignLaterHint')}
                  </Typography>
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} sx={{ color: 'neutral.700' }} disabled={loading}>
          {tDlg('cancel')}
        </Button>
        <Button onClick={handleCreate} variant="contained" sx={{ bgcolor: 'primary.main' }} disabled={loading}>
          {loading ? tDlg('creating') : tDlg('createSet')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
