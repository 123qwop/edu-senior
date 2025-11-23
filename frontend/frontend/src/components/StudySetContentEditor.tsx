import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  IconButton,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { getStudySetQuestions, addQuestion, updateQuestion, deleteQuestion, type Question, type StudySetOut } from '../api/studySetsApi'

interface StudySetContentEditorProps {
  open: boolean
  onClose: () => void
  studySet: StudySetOut | null
}

export default function StudySetContentEditor({ open, onClose, studySet }: StudySetContentEditorProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const [questionType, setQuestionType] = useState<string>('')
  const [content, setContent] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [options, setOptions] = useState<string[]>(['', '', '', ''])
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')

  useEffect(() => {
    if (open && studySet) {
      fetchQuestions()
    }
  }, [open, studySet])

  const fetchQuestions = async () => {
    if (!studySet) return
    try {
      setLoading(true)
      setError(null)
      const data = await getStudySetQuestions(studySet.id)
      setQuestions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setQuestionType('')
    setContent('')
    setCorrectAnswer('')
    setOptions(['', '', '', ''])
    setTerm('')
    setDefinition('')
    setProblem('')
    setSolution('')
    setEditingQuestion(null)
    setShowAddForm(false)
  }

  const handleAddClick = () => {
    if (!studySet) return
    resetForm()
    const questionTypeForSet = studySet.type === 'Flashcards' ? 'flashcard' : studySet.type === 'Quiz' ? 'multiple_choice' : 'problem'
    setQuestionType(questionTypeForSet)
    setShowAddForm(true)
  }

  const handleEditClick = (question: Question) => {
    setEditingQuestion(question)
    setQuestionType(question.type)
    setContent(question.content)
    setCorrectAnswer(question.correct_answer)
    if (question.type === 'flashcard') {
      setTerm(question.term || '')
      setDefinition(question.definition || '')
    } else if (question.type === 'multiple_choice') {
      const questionOptions = question.options || []
      setOptions(questionOptions.length > 0 ? questionOptions : ['', '', '', ''])
      setCorrectAnswer(question.correct_answer)
    } else if (question.type === 'problem') {
      setProblem(question.content)
      setSolution(question.correct_answer)
    }
    setShowAddForm(true)
  }

  const handleDeleteClick = async (questionId: number) => {
    if (!studySet) return
    if (!window.confirm('Are you sure you want to delete this item?')) return

    try {
      await deleteQuestion(studySet.id, questionId)
      fetchQuestions()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  const handleSubmit = async () => {
    if (!studySet) return

    try {
      setError(null)

      if (!questionType) {
        setError('Question type is required')
        return
      }

      let questionData: any = {
        type: questionType,
        content: '',
        correct_answer: '',
      }

      if (questionType === 'flashcard') {
        if (!term.trim() || !definition.trim()) {
          setError('Term and definition are required')
          return
        }
        questionData.content = term
        questionData.correct_answer = definition
        questionData.term = term
        questionData.definition = definition
      } else if (questionType === 'multiple_choice') {
        if (!content.trim()) {
          setError('Question is required')
          return
        }
        const validOptions = options.filter(opt => opt.trim())
        if (validOptions.length < 2) {
          setError('At least 2 options are required')
          return
        }
        if (!correctAnswer.trim()) {
          setError('Correct answer is required')
          return
        }
        questionData.content = content
        questionData.correct_answer = correctAnswer
        questionData.options = validOptions
      } else if (questionType === 'true_false') {
        if (!content.trim()) {
          setError('Question is required')
          return
        }
        questionData.content = content
        questionData.correct_answer = correctAnswer === 'true' ? 'true' : 'false'
      } else if (questionType === 'short_answer') {
        if (!content.trim()) {
          setError('Question is required')
          return
        }
        if (!correctAnswer.trim()) {
          setError('Correct answer is required')
          return
        }
        questionData.content = content
        questionData.correct_answer = correctAnswer
      } else if (questionType === 'problem') {
        if (!problem.trim() || !solution.trim()) {
          setError('Problem and solution are required')
          return
        }
        questionData.content = problem
        questionData.correct_answer = solution
        questionData.problem = problem
        questionData.solution = solution
      }

      if (editingQuestion) {
        await updateQuestion(studySet.id, editingQuestion.id, questionData)
      } else {
        await addQuestion(studySet.id, questionData)
      }

      resetForm()
      fetchQuestions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!studySet) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Manage Content: {studySet.title}</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            sx={{ bgcolor: 'primary.main' }}
          >
            Add {studySet.type === 'Flashcards' ? 'Flashcard' : studySet.type === 'Quiz' ? 'Question' : 'Problem'}
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {showAddForm && (
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'neutral.50', border: '1px solid', borderColor: 'primary.main' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {editingQuestion ? 'Edit' : 'Add'} {studySet.type === 'Flashcards' ? 'Flashcard' : studySet.type === 'Quiz' ? 'Question' : 'Problem'}
              </Typography>

              {studySet.type === 'Flashcards' && (
                <Stack spacing={2}>
                  <TextField
                    label="Term"
                    required
                    fullWidth
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g., Photosynthesis"
                  />
                  <TextField
                    label="Definition"
                    required
                    fullWidth
                    multiline
                    rows={3}
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    placeholder="e.g., The process by which plants convert light energy into chemical energy"
                  />
                </Stack>
              )}

              {studySet.type === 'Quiz' && (
                <Stack spacing={2}>
                  <FormControl fullWidth required>
                    <InputLabel>Question Type</InputLabel>
                    <Select
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value)}
                      label="Question Type"
                    >
                      <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                      <MenuItem value="true_false">True/False</MenuItem>
                      <MenuItem value="short_answer">Short Answer</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Question"
                    required
                    fullWidth
                    multiline
                    rows={2}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your question"
                  />

                  {questionType === 'multiple_choice' && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                        Options
                      </Typography>
                      {options.map((option, idx) => (
                        <TextField
                          key={idx}
                          fullWidth
                          size="small"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...options]
                            newOptions[idx] = e.target.value
                            setOptions(newOptions)
                          }}
                          placeholder={`Option ${idx + 1}`}
                          sx={{ mb: 1 }}
                        />
                      ))}
                      <Button
                        size="small"
                        onClick={() => setOptions([...options, ''])}
                        sx={{ mt: 1 }}
                      >
                        Add Option
                      </Button>
                      <FormControl fullWidth required sx={{ mt: 2 }}>
                        <InputLabel>Correct Answer</InputLabel>
                        <Select
                          value={correctAnswer}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          label="Correct Answer"
                        >
                          {options.map((opt, idx) => (
                            opt.trim() && (
                              <MenuItem key={idx} value={opt}>
                                Option {idx + 1}: {opt}
                              </MenuItem>
                            )
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {questionType === 'true_false' && (
                    <FormControl component="fieldset">
                      <RadioGroup
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                      >
                        <FormControlLabel value="true" control={<Radio />} label="True" />
                        <FormControlLabel value="false" control={<Radio />} label="False" />
                      </RadioGroup>
                    </FormControl>
                  )}

                  {questionType === 'short_answer' && (
                    <TextField
                      label="Correct Answer"
                      required
                      fullWidth
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      placeholder="Enter the correct answer"
                    />
                  )}
                </Stack>
              )}

              {studySet.type === 'Problem set' && (
                <Stack spacing={2}>
                  <TextField
                    label="Problem"
                    required
                    fullWidth
                    multiline
                    rows={4}
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="Enter the problem statement"
                  />
                  <TextField
                    label="Solution"
                    required
                    fullWidth
                    multiline
                    rows={4}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="Enter the solution with steps"
                  />
                </Stack>
              )}

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button onClick={resetForm}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit}>
                  {editingQuestion ? 'Update' : 'Add'}
                </Button>
              </Stack>
            </Paper>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : questions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50' }}>
              <Typography variant="body1" sx={{ color: 'neutral.500', mb: 2 }}>
                No content yet. Click "Add" to create your first {studySet.type === 'Flashcards' ? 'flashcard' : studySet.type === 'Quiz' ? 'question' : 'problem'}.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {questions.map((question, idx) => (
                <Paper key={question.id} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'neutral.200' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                        #{idx + 1} - {question.type === 'flashcard' ? 'Flashcard' : question.type === 'multiple_choice' ? 'Multiple Choice' : question.type === 'true_false' ? 'True/False' : question.type === 'short_answer' ? 'Short Answer' : 'Problem'}
                      </Typography>
                      {question.type === 'flashcard' ? (
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                            Term: {question.term}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'neutral.600' }}>
                            Definition: {question.definition}
                          </Typography>
                        </Box>
                      ) : question.type === 'problem' ? (
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                            Problem: {question.content}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'neutral.600' }}>
                            Solution: {question.correct_answer}
                          </Typography>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                            {question.content}
                          </Typography>
                          {question.options && question.options.length > 0 && (
                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                              {question.options.map((opt, optIdx) => (
                                <Typography key={optIdx} variant="body2" sx={{ color: 'neutral.600' }}>
                                  {optIdx + 1}. {opt}
                                </Typography>
                              ))}
                            </Stack>
                          )}
                          <Typography variant="body2" sx={{ color: 'success.main', mt: 1, fontWeight: 600 }}>
                            Correct Answer: {question.correct_answer}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(question)}
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(question.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
