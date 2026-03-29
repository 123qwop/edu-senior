import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import {
  getStudySet,
  getStudySetQuestions,
  recordProgress,
  getAiStatus,
  aiHint,
  aiExplain,
  type Question,
} from '../api/studySetsApi'
import { getUserRole, getMe } from '../api/authApi'

export default function Practice() {
  const { t } = useTranslation()
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
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiDialogTitle, setAiDialogTitle] = useState('')
  const [aiDialogText, setAiDialogText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  useEffect(() => {
    getAiStatus()
      .then((s) => setAiEnabled(!!s.enabled))
      .catch(() => setAiEnabled(false))
  }, [])

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
      setError(err instanceof Error ? err.message : t('practice.loadFailed'))
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
      alert(err instanceof Error ? err.message : t('practice.submitFailed'))
    }
  }

  const handleFlipFlashcard = (questionId: number) => {
    setFlashcardFlipped({ ...flashcardFlipped, [questionId]: !flashcardFlipped[questionId] })
  }

  const buildQuestionPrompt = (q: Question): string => {
    if (q.type === 'flashcard') {
      return `Flashcard\nTerm: ${q.term ?? ''}\nDefinition: ${q.definition ?? ''}`
    }
    let base = q.content || ''
    if (q.type === 'multiple_choice' && q.options?.length) {
      base += '\nOptions:\n' + q.options.map((o, i) => `${i}. ${o}`).join('\n')
    }
    return base
  }

  const buildUserAnswerLabel = (q: Question): string => {
    const raw = answers[q.id]
    if (raw === undefined || raw === '') return ''
    if (q.type === 'multiple_choice' && q.options) {
      const idx = parseInt(String(raw), 10)
      if (!Number.isNaN(idx) && q.options[idx] !== undefined) return q.options[idx]
    }
    return String(raw)
  }

  const resolveCorrectAnswerLabel = (q: Question): string | undefined => {
    if (!q.correct_answer) return undefined
    if (q.type === 'multiple_choice' && q.options) {
      const idx = parseInt(String(q.correct_answer), 10)
      if (!Number.isNaN(idx) && q.options[idx] !== undefined) return q.options[idx]
    }
    return q.correct_answer
  }

  const handleAiHint = async () => {
    const q = questions[currentQuestionIndex]
    if (!q) return
    setAiDialogOpen(true)
    setAiDialogTitle(t('practice.aiDialogHintTitle'))
    setAiDialogText(t('practice.aiLoading'))
    setAiBusy(true)
    try {
      const { text } = await aiHint({
        question: buildQuestionPrompt(q),
        topic: studySet?.subject,
      })
      setAiDialogText(text)
    } catch (e) {
      setAiDialogText(e instanceof Error ? e.message : t('practice.aiError'))
    } finally {
      setAiBusy(false)
    }
  }

  const handleAiExplain = async () => {
    const q = questions[currentQuestionIndex]
    if (!q) return
    if (q.type !== 'flashcard') {
      const ua = buildUserAnswerLabel(q)
      if (!ua) {
        alert(t('practice.aiNeedAnswer'))
        return
      }
    }
    setAiDialogOpen(true)
    setAiDialogTitle(t('practice.aiDialogExplainTitle'))
    setAiDialogText(t('practice.aiLoading'))
    setAiBusy(true)
    try {
      const userAnswer =
        q.type === 'flashcard'
          ? 'Flashcard practice: reviewing term and definition.'
          : buildUserAnswerLabel(q)!
      const { text } = await aiExplain({
        question: buildQuestionPrompt(q),
        user_answer: userAnswer,
        correct_answer: resolveCorrectAnswerLabel(q),
        subject: studySet?.subject,
      })
      setAiDialogText(text)
    } catch (e) {
      setAiDialogText(e instanceof Error ? e.message : t('practice.aiError'))
    } finally {
      setAiBusy(false)
    }
  }

  const renderQuestion = (question: Question) => {
    if (question.type === 'flashcard') {
      const isFlipped = flashcardFlipped[question.id] || false
      return (
        <Card sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleFlipFlashcard(question.id)}>
          <CardContent sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              {isFlipped ? t('practice.definition') : t('practice.term')}
            </Typography>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
              {isFlipped ? question.definition : question.term}
            </Typography>
            <Typography variant="body2" sx={{ mt: 3, color: 'neutral.500' }}>
              {t('practice.clickToFlip')}
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
              label={t('practice.true')}
              sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'neutral.200', borderRadius: 2 }}
            />
            <FormControlLabel
              value="false"
              control={<Radio />}
              label={t('practice.false')}
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
            placeholder={t('practice.placeholderShort')}
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
            placeholder={t('practice.placeholderProblem')}
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
        <Typography>{t('common.loading')}</Typography>
      </Box>
    )
  }

  if (error || !studySet) {
    return (
      <Box sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/study-sets')} sx={{ mb: 2 }}>
          {t('practice.backToSets')}
        </Button>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {error || t('practice.notFound')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            {t('practice.noAccess')}
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (questions.length === 0) {
    return (
      <Box sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/study-sets')} sx={{ mb: 2 }}>
          {t('practice.backToSets')}
        </Button>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('practice.noContentTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500', mb: 3 }}>
            {t('practice.noContentBody')}
          </Typography>
          {userId && studySet.creator_id === userId && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/dashboard/study-sets`)}
            >
              {t('practice.editToAddContent')}
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
        {t('practice.backToSets')}
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
            {t('practice.questionOf', { current: currentQuestionIndex + 1, total: questions.length })}
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
      </Paper>

      <Paper elevation={0} sx={{ p: 4, mb: 3 }}>
        {renderQuestion(currentQuestion)}
      </Paper>

      {aiEnabled && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleAiHint}
            disabled={aiBusy}
          >
            {t('practice.aiHint')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleAiExplain}
            disabled={aiBusy}
          >
            {t('practice.aiExplain')}
          </Button>
        </Stack>
      )}

      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          {t('practice.previous')}
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={currentQuestion.type !== 'flashcard' && (answers[currentQuestion.id] === undefined || answers[currentQuestion.id] === '')}
          sx={{ bgcolor: 'primary.main' }}
        >
          {currentQuestionIndex === questions.length - 1 ? t('practice.submit') : t('practice.next')}
        </Button>
      </Stack>

      <Dialog
        open={aiDialogOpen}
        onClose={() => !aiBusy && setAiDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{aiDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{aiDialogText}</Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={aiBusy} onClick={() => setAiDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showResults} maxWidth="sm" fullWidth>
        <DialogTitle>{t('practice.results')}</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
              {results?.mastery_percentage.toFixed(0)}%
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {t('practice.scoreLine', { correct: results?.correct_answers, total: results?.total_questions })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={results?.mastery_percentage || 0}
              sx={{ height: 12, borderRadius: 6, mb: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/dashboard/study-sets')}>{t('practice.backToSets')}</Button>
          <Button variant="contained" onClick={() => {
            setShowResults(false)
            setCurrentQuestionIndex(0)
            setAnswers({})
            setFlashcardFlipped({})
          }}>
            {t('practice.tryAgain')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
