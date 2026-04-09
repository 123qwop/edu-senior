import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
  Collapse,
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
  getRuleBasedRecommendations,
  type Question,
  type RuleBasedRecommendationItem,
} from '../api/studySetsApi'
import { getUserRole, getMe } from '../api/authApi'
import MathText from '../components/MathText'
import { formatDueDateTime, isDuePast } from '../utils/assignmentDisplay'

/** Flashcard / T/F labels: follow Russian or Kazakh when the set subject matches, else UI language. */
function practiceChromeLng(subject: string | undefined, uiLng: string): 'en' | 'ru' | 'kz' {
  const s = (subject || '').toLowerCase()
  if (/russian|русск|русский/.test(s)) return 'ru'
  if (/kazakh|қазақ|qazaq|казах/.test(s)) return 'kz'
  if (uiLng.startsWith('ru')) return 'ru'
  if (uiLng === 'kz' || uiLng.startsWith('kk')) return 'kz'
  return 'en'
}

export default function Practice() {
  const { t, i18n } = useTranslation()
  const { setId } = useParams<{ setId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const assignmentIdParam = searchParams.get('assignmentId')
  const assignmentId =
    assignmentIdParam && !Number.isNaN(parseInt(assignmentIdParam, 10))
      ? parseInt(assignmentIdParam, 10)
      : undefined
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
  /** Filled when results dialog opens; rule-based only, does not use Gemini. */
  const [afterPracticeRecs, setAfterPracticeRecs] = useState<RuleBasedRecommendationItem[]>([])
  /** Per-question: user tapped Check answer and we show right/wrong before Next */
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<number, { correct: boolean }>>({})
  const [explanationOpen, setExplanationOpen] = useState(false)
  /** Full question list for the set (never shrinks); `questions` may be a subset when redoing wrong only */
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [sessionResults, setSessionResults] = useState<
    Array<{ id: number; correct: boolean; snippet: string }>
  >([])
  const [resultsStaticExpanded, setResultsStaticExpanded] = useState<Record<number, boolean>>({})
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(null)
  const [practiceAttemptKey, setPracticeAttemptKey] = useState(0)
  const timeUpSubmitRef = useRef(false)

  const tPracticeChrome = useMemo(() => {
    const lng = practiceChromeLng(studySet?.subject, i18n.language)
    if (lng === 'ru') return i18n.getFixedT('ru')
    if (lng === 'kz') return i18n.getFixedT('kz')
    return i18n.getFixedT(i18n.language)
  }, [studySet?.subject, i18n])

  useEffect(() => {
    getAiStatus()
      .then((s) => setAiEnabled(!!s.enabled))
      .catch(() => setAiEnabled(false))
  }, [])

  useEffect(() => {
    if (!showResults) {
      return
    }
    let cancelled = false
    getRuleBasedRecommendations()
      .then((list) => {
        if (!cancelled) {
          setAfterPracticeRecs(Array.isArray(list) ? list.slice(0, 3) : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAfterPracticeRecs([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [showResults])

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
        getStudySet(parseInt(setId!), assignmentId != null ? { assignmentId } : undefined),
        getStudySetQuestions(parseInt(setId!)),
      ])
      setStudySet(setData)
      setAllQuestions(questionsData)
      setQuestions(questionsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('practice.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const isGradedQuestion = (q: Question) => q.type !== 'flashcard'

  const evaluateAnswerCorrect = (q: Question, raw: string | number | boolean | undefined): boolean => {
    if (raw === undefined || raw === '') return false
    if (q.type === 'multiple_choice' && q.options?.length) {
      const idx = parseInt(String(raw), 10)
      if (Number.isNaN(idx) || idx < 0 || idx >= q.options.length) return false
      const selected = q.options[idx].trim()
      const correct = String(q.correct_answer ?? '').trim()
      return selected.toLowerCase() === correct.toLowerCase()
    }
    if (q.type === 'true_false') {
      const ua = String(raw).toLowerCase()
      const ca = String(q.correct_answer ?? '').trim().toLowerCase()
      return ua === ca
    }
    return String(raw).trim().toLowerCase() === String(q.correct_answer ?? '').trim().toLowerCase()
  }

  const handleAnswerChange = (questionId: number, value: string | number | boolean) => {
    setAnswers({ ...answers, [questionId]: value })
    setFeedbackByQuestion((prev) => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  const handleCheckAnswer = () => {
    const q = questions[currentQuestionIndex]
    if (!q || !isGradedQuestion(q)) return
    const raw = answers[q.id]
    const correct = evaluateAnswerCorrect(q, raw)
    setFeedbackByQuestion((prev) => ({ ...prev, [q.id]: { correct } }))
  }

  const handleRetryQuestion = () => {
    const q = questions[currentQuestionIndex]
    if (!q) return
    setFeedbackByQuestion((prev) => {
      const next = { ...prev }
      delete next[q.id]
      return next
    })
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

  const buildProgressPayload = () => {
    const merged: { [key: string]: string | number | boolean } = {}
    for (const q of allQuestions) {
      const v = answers[q.id]
      if (v !== undefined && v !== '') {
        merged[String(q.id)] = v
      }
    }
    return merged
  }

  const handleSubmit = async () => {
    try {
      const merged = buildProgressPayload()
      const result = await recordProgress(parseInt(setId!), merged)
      setResults(result)
      const details = allQuestions.map((q) => ({
        id: q.id,
        correct: !isGradedQuestion(q) ? true : evaluateAnswerCorrect(q, merged[String(q.id)] ?? answers[q.id]),
        snippet: (q.content || '').replace(/\s+/g, ' ').slice(0, 100),
      }))
      setSessionResults(details)
      setResultsStaticExpanded({})
      setShowResults(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : t('practice.submitFailed'))
    }
  }

  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  useEffect(() => {
    if (showResults) {
      return
    }
    const lim = studySet?.assignment_time_limit_minutes
    if (!lim || lim < 1) {
      setSessionSecondsLeft(null)
      timeUpSubmitRef.current = false
      return
    }
    let left = lim * 60
    setSessionSecondsLeft(left)
    timeUpSubmitRef.current = false
    const id = window.setInterval(() => {
      left -= 1
      setSessionSecondsLeft(left)
      if (left <= 0) {
        window.clearInterval(id)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [studySet?.assignment_time_limit_minutes, setId, practiceAttemptKey, showResults])

  useEffect(() => {
    if (sessionSecondsLeft !== 0 || showResults || timeUpSubmitRef.current) {
      return
    }
    timeUpSubmitRef.current = true
    void handleSubmitRef.current()
  }, [sessionSecondsLeft, showResults])

  const handleTryWholeSetAgain = () => {
    setShowResults(false)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setFlashcardFlipped({})
    setFeedbackByQuestion({})
    setSessionResults([])
    setQuestions(allQuestions)
    timeUpSubmitRef.current = false
    setPracticeAttemptKey((k) => k + 1)
  }

  const handleRedoWrongOnly = () => {
    const wrongGraded = sessionResults.filter((r) => {
      if (r.correct) return false
      const q = allQuestions.find((x) => x.id === r.id)
      return q ? isGradedQuestion(q) : false
    })
    if (wrongGraded.length === 0) {
      alert(t('practice.redoWrongNone'))
      return
    }
    const ids = new Set(wrongGraded.map((w) => w.id))
    setQuestions(allQuestions.filter((q) => ids.has(q.id)))
    setCurrentQuestionIndex(0)
    setFeedbackByQuestion({})
    setShowResults(false)
    setAnswers((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        delete next[id]
      })
      return next
    })
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
        response_language: i18n.language,
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
        response_language: i18n.language,
      })
      setAiDialogText(text)
    } catch (e) {
      setAiDialogText(e instanceof Error ? e.message : t('practice.aiError'))
    } finally {
      setAiBusy(false)
    }
  }

  /** Post-submit only: breakdown row for an incorrect graded question (not shown during end_only attempt). */
  const handleAiExplainResults = async (q: Question) => {
    if (!q || q.type === 'flashcard') return
    const ua = buildUserAnswerLabel(q)
    const userAnswer = ua || t('practice.noAnswerForExplanation')
    setAiDialogOpen(true)
    setAiDialogTitle(t('practice.aiDialogExplainTitle'))
    setAiDialogText(t('practice.aiLoading'))
    setAiBusy(true)
    try {
      const { text } = await aiExplain({
        question: buildQuestionPrompt(q),
        user_answer: userAnswer,
        correct_answer: resolveCorrectAnswerLabel(q),
        subject: studySet?.subject,
        response_language: i18n.language,
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
              {isFlipped ? tPracticeChrome('practice.definition') : tPracticeChrome('practice.term')}
            </Typography>
            <Box sx={{ color: 'primary.main', fontWeight: 700, typography: 'h4' }}>
              <MathText text={isFlipped ? question.definition : question.term} block />
            </Box>
            <Typography variant="body2" sx={{ mt: 3, color: 'neutral.500' }}>
              {tPracticeChrome('practice.clickToFlip')}
            </Typography>
          </CardContent>
        </Card>
      )
    }

    if (question.type === 'multiple_choice') {
      return (
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600, fontSize: '1.1rem' }}>
            <MathText text={question.content} block />
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
                label={<MathText text={option} />}
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
            <MathText text={question.content} block />
          </FormLabel>
          <RadioGroup
            value={answers[question.id] ?? ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            <FormControlLabel
              value="true"
              control={<Radio />}
              label={tPracticeChrome('practice.true')}
              sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'neutral.200', borderRadius: 2 }}
            />
            <FormControlLabel
              value="false"
              control={<Radio />}
              label={tPracticeChrome('practice.false')}
              sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'neutral.200', borderRadius: 2 }}
            />
          </RadioGroup>
        </FormControl>
      )
    }

    if (question.type === 'short_answer') {
      return (
        <Box>
          <Box sx={{ mb: 2, typography: 'h6', fontWeight: 600 }}>
            <MathText text={question.content} block />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={tPracticeChrome('practice.placeholderShort')}
            variant="outlined"
          />
        </Box>
      )
    }

    if (question.type === 'problem') {
      return (
        <Box>
          <Box sx={{ mb: 2, typography: 'h6', fontWeight: 600 }}>
            <MathText text={question.content} block />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={tPracticeChrome('practice.placeholderProblem')}
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

  /** Personal + public + teacher "immediate" assignment: per-question check & explain. Assigned default end_only hides them until results. */
  const immediateMode = studySet?.practice_feedback_mode !== 'end_only'

  const hasProvidedAnswer = (q: Question) =>
    q.type === 'flashcard' || (answers[q.id] !== undefined && answers[q.id] !== '')
  const graded = isGradedQuestion(currentQuestion)
  const checked = feedbackByQuestion[currentQuestion.id] !== undefined
  const fb = feedbackByQuestion[currentQuestion.id]
  const nextDisabled = graded && !hasProvidedAnswer(currentQuestion)
  const checkDisabled =
    !immediateMode || !graded || !hasProvidedAnswer(currentQuestion) || checked

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
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={studySet.subject} size="small" />
              <Chip label={studySet.type} size="small" color="primary" />
              {studySet.active_assignment_id != null && studySet.assignment_due_date ? (
                <Chip
                  size="small"
                  variant="outlined"
                  color={isDuePast(studySet.assignment_due_date) && !showResults ? 'error' : 'default'}
                  label={`${t('common.due')} ${formatDueDateTime(studySet.assignment_due_date, i18n.language)}`}
                />
              ) : null}
              {studySet.active_assignment_id != null &&
              studySet.assignment_time_limit_minutes != null &&
              studySet.assignment_time_limit_minutes > 0 ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('dashboard.sessionTimeLimit', { count: studySet.assignment_time_limit_minutes })}
                />
              ) : null}
            </Stack>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            {sessionSecondsLeft != null && !showResults ? (
              <Chip
                size="small"
                sx={{ mb: 0.5 }}
                color={sessionSecondsLeft <= 60 ? 'warning' : 'default'}
                label={t('practice.timeRemaining', {
                  time: `${Math.floor(sessionSecondsLeft / 60)}:${String(sessionSecondsLeft % 60).padStart(2, '0')}`,
                })}
              />
            ) : null}
            <Typography variant="body2" sx={{ color: 'neutral.500', display: 'block' }}>
              {t('practice.questionOf', { current: currentQuestionIndex + 1, total: questions.length })}
            </Typography>
          </Box>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
      </Paper>

      <Paper elevation={0} sx={{ p: 4, mb: 3 }}>
        {renderQuestion(currentQuestion)}
      </Paper>

      {aiEnabled && immediateMode && (
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

      <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-start" flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          {t('practice.previous')}
        </Button>
        {graded && immediateMode ? (
          <Button variant="outlined" color="secondary" onClick={handleCheckAnswer} disabled={checkDisabled}>
            {t('practice.checkAnswer')}
          </Button>
        ) : null}
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={nextDisabled}
          sx={{ bgcolor: 'primary.main' }}
        >
          {currentQuestionIndex === questions.length - 1 ? t('practice.submit') : t('practice.next')}
        </Button>
      </Stack>

      {immediateMode && graded && checked && fb ? (
        <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: fb.correct ? 'success.50' : 'error.50', border: '1px solid', borderColor: fb.correct ? 'success.light' : 'error.light' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: fb.correct ? 'success.dark' : 'error.dark' }}>
              {fb.correct ? t('practice.feedbackCorrect') : t('practice.feedbackIncorrect')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" size="small" onClick={handleRetryQuestion}>
                {t('practice.tryAnotherAnswer')}
              </Button>
              <Button variant="outlined" size="small" onClick={() => setExplanationOpen(true)}>
                {t('practice.viewExplanation')}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Dialog open={explanationOpen} onClose={() => setExplanationOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('practice.explanationTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1, color: 'neutral.600' }}>
            {t('practice.correctAnswerLabel')}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <MathText text={resolveCorrectAnswerLabel(currentQuestion) ?? '—'} block />
          </Box>
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options?.length ? (
            <Typography variant="caption" sx={{ display: 'block', color: 'neutral.600' }}>
              {t('practice.yourAnswerLabel')}: {buildUserAnswerLabel(currentQuestion)}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          {aiEnabled ? (
            <Button
              startIcon={<AutoAwesomeIcon />}
              onClick={() => {
                setExplanationOpen(false)
                handleAiExplain()
              }}
              disabled={aiBusy}
            >
              {t('practice.aiExplain')}
            </Button>
          ) : null}
          <Button onClick={() => setExplanationOpen(false)}>{t('common.cancel')}</Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={showResults} maxWidth="md" fullWidth>
        <DialogTitle>{t('practice.results')}</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
              {Number(results?.mastery_percentage ?? 0).toFixed(0)}%
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {t('practice.scoreLine', {
                correct: results?.correct_answers ?? 0,
                total: results?.total_questions ?? 0,
              })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={results?.mastery_percentage || 0}
              sx={{ height: 12, borderRadius: 6, mb: 2 }}
            />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, textAlign: 'left', fontWeight: 600 }}>
              {t('practice.breakdownTitle')}
            </Typography>
            <Stack spacing={1} sx={{ mb: 2, textAlign: 'left', maxHeight: 320, overflow: 'auto' }}>
              {sessionResults.map((row) => {
                const q = allQuestions.find((x) => x.id === row.id)
                const gradedRow = q ? isGradedQuestion(q) : false
                const wrongGraded = !row.correct && gradedRow
                const staticText = (q?.explanation ?? '').trim()
                const hasStatic = staticText.length > 0
                const qIndex = allQuestions.findIndex((x) => x.id === row.id) + 1
                return (
                  <Box
                    key={row.id}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'neutral.200',
                      pb: 1,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography variant="body2" sx={{ color: row.correct ? 'success.main' : 'error.main' }}>
                      {row.correct ? '✓' : '✗'} Q{qIndex}
                      {row.snippet ? ` — ${row.snippet}` : ''}
                    </Typography>
                    {wrongGraded && q ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75, pl: 0.25 }}>
                        {hasStatic ? (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() =>
                              setResultsStaticExpanded((prev) => ({
                                ...prev,
                                [row.id]: !prev[row.id],
                              }))
                            }
                          >
                            {resultsStaticExpanded[row.id]
                              ? t('practice.resultsHideExplanation')
                              : t('practice.resultsShowExplanation')}
                          </Button>
                        ) : null}
                        {aiEnabled ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={() => void handleAiExplainResults(q)}
                            disabled={aiBusy}
                          >
                            {t('practice.resultsExplainThisQuestion')}
                          </Button>
                        ) : null}
                      </Stack>
                    ) : null}
                    {wrongGraded && hasStatic && q ? (
                      <Collapse in={!!resultsStaticExpanded[row.id]}>
                        <Box sx={{ pl: 1, pt: 0.5, textAlign: 'left' }}>
                          <MathText text={staticText} block />
                        </Box>
                      </Collapse>
                    ) : null}
                  </Box>
                )
              })}
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, textAlign: 'left', fontWeight: 600 }}>
              {t('practice.suggestedNextTitle')}
            </Typography>
            {afterPracticeRecs.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'left' }}>
                {t('practice.suggestedNextFallback')}
              </Typography>
            ) : (
              <Stack spacing={1.5} sx={{ textAlign: 'left' }}>
                {afterPracticeRecs.map((rec) => (
                  <Box key={rec.id} sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'neutral.200' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {rec.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'neutral.600', display: 'block', mb: 1 }}>
                      {rec.reason}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/dashboard/study-sets/${rec.id}/practice`)}
                    >
                      {t('common.practice')}
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => navigate('/dashboard/study-sets')}>{t('practice.backToSets')}</Button>
          <Button variant="outlined" onClick={handleRedoWrongOnly}>
            {t('practice.redoWrongOnly')}
          </Button>
          <Button variant="contained" onClick={handleTryWholeSetAgain}>
            {t('practice.tryAgain')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
