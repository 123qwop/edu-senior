import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { getStudySet, getStudySetQuestions, recordProgress, type Question } from '../api/studySetsApi'
import { getUserRole, getMe } from '../api/authApi'

export default function Practice() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const [studySet, setStudySet] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [key: string]: string | number | boolean }>({})
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flashcardFlipped, setFlashcardFlipped] = useState<{ [key: number]: boolean }>({})
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    if (getUserRole() !== 'student') {
      navigate('/dashboard/study-sets')
      return
    }

    const fetchUserInfo = async () => {
      try {
        const userData = await getMe()
        if (userData.id) {
          setUserId(userData.id)
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err)
      }
    }
    fetchUserInfo()

    if (setId) {
      fetchData()
    }
  }, [setId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [setData, questionsData] = await Promise.all([
        getStudySet(parseInt(setId!)),
        getStudySetQuestions(parseInt(setId!)),
      ])
      setStudySet(setData)
      setQuestions(questionsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study set')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: number, value: string | number | boolean) => {
    setAnswers({ ...answers, [questionId]: value })
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const result = await recordProgress(parseInt(setId!), answers)
      setResults(result)
      setShowResults(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit answers')
    }
  }

  const handleFlipFlashcard = (questionId: number) => {
    setFlashcardFlipped({ ...flashcardFlipped, [questionId]: !flashcardFlipped[questionId] })
  }

  const renderQuestion = (question: Question) => {
    if (question.type === 'flashcard') {
      const isFlipped = flashcardFlipped[question.id] || false
      return (
        <Card sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleFlipFlashcard(question.id)}>
          <CardContent sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              {isFlipped ? 'Definition' : 'Term'}
            </Typography>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
              {isFlipped ? question.definition : question.term}
            </Typography>
            <Typography variant="body2" sx={{ mt: 3, color: 'neutral.500' }}>
              Click to flip
            </Typography>
          </CardContent>
        </Card>
      )
    }

    if (question.type === 'multiple_choice') {
      return (
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600, fontSize: '1.1rem' }}>
            {question.content}
          </FormLabel>
          <RadioGroup
            value={answers[question.id] ?? ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            {question.options?.map((option, idx) => (
              <FormControlLabel
                key={idx}
                value={idx.toString()}
                control={<Radio />}
                label={option}
                sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'neutral.200', borderRadius: 2 }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      )
    }

    if (question.type === 'true_false') {
      return (
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600, fontSize: '1.1rem' }}>
            {question.content}
          </FormLabel>
          <RadioGroup
            value={answers[question.id] ?? ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            <FormControlLabel
              value="true"
              control={<Radio />}
              label="True"
              sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'neutral.200', borderRadius: 2 }}
            />
            <FormControlLabel
              value="false"
              control={<Radio />}
              label="False"
              sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'neutral.200', borderRadius: 2 }}
            />
          </RadioGroup>
        </FormControl>
      )
    }

    if (question.type === 'short_answer') {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {question.content}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer here..."
            variant="outlined"
          />
        </Box>
      )
    }

    if (question.type === 'problem') {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {question.content}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Show your work and solution..."
            variant="outlined"
          />
        </Box>
      )
    }

    return null
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  if (error || !studySet) {
    return (
      <Box sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/study-sets')} sx={{ mb: 2 }}>
          Back to Study Sets
        </Button>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {error || 'Study set not found'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            This study set doesn't exist or you don't have access to it.
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (questions.length === 0) {
    return (
      <Box sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/study-sets')} sx={{ mb: 2 }}>
          Back to Study Sets
        </Button>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No content yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500', mb: 3 }}>
            This study set doesn't have any questions or flashcards yet.
          </Typography>
          {userId && studySet.creator_id === userId && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/dashboard/study-sets`)}
            >
              Edit study set to add content
            </Button>
          )}
        </Paper>
      </Box>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <Box sx={{ py: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/study-sets')} sx={{ mb: 3 }}>
        Back to Study Sets
      </Button>

      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {studySet.title}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip label={studySet.subject} size="small" />
              <Chip label={studySet.type} size="small" color="primary" />
            </Stack>
          </Box>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
      </Paper>

      <Paper elevation={0} sx={{ p: 4, mb: 3 }}>
        {renderQuestion(currentQuestion)}
      </Paper>

      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={currentQuestion.type !== 'flashcard' && (answers[currentQuestion.id] === undefined || answers[currentQuestion.id] === '')}
          sx={{ bgcolor: 'primary.main' }}
        >
          {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
        </Button>
      </Stack>

      <Dialog open={showResults} maxWidth="sm" fullWidth>
        <DialogTitle>Results</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
              {results?.mastery_percentage.toFixed(0)}%
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              You got {results?.correct_answers} out of {results?.total_questions} questions correct!
            </Typography>
            <LinearProgress
              variant="determinate"
              value={results?.mastery_percentage || 0}
              sx={{ height: 12, borderRadius: 6, mb: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/dashboard/study-sets')}>Back to Study Sets</Button>
          <Button variant="contained" onClick={() => {
            setShowResults(false)
            setCurrentQuestionIndex(0)
            setAnswers({})
            setFlashcardFlipped({})
          }}>
            Try Again
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
