import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  InputAdornment,
} from '@mui/material'
import { createAssignment, getClasses, type StudySetOut, type ClassOut } from '../api/studySetsApi'

interface AssignStudySetToClassDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  studySet: StudySetOut | null
}

export default function AssignStudySetToClassDialog({
  open,
  onClose,
  onSuccess,
  studySet,
}: AssignStudySetToClassDialogProps) {
  const { t } = useTranslation()
  const [classes, setClasses] = useState<ClassOut[]>([])
  const [classId, setClassId] = useState<number | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('')
  const [feedbackMode, setFeedbackMode] = useState<'immediate' | 'end_only'>('end_only')
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingClasses(true)
    setError(null)
    getClasses()
      .then((data) => {
        if (!cancelled) setClasses(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('assignDialog.loadClassesFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, t])

  useEffect(() => {
    if (open) {
      setClassId('')
      setDueDate('')
      setTimeLimitMinutes('')
      setFeedbackMode('end_only')
      setError(null)
    }
  }, [open, studySet?.id])

  const handleSubmit = async () => {
    if (!studySet || !classId) {
      setError(t('assignDialog.errorSelectClass'))
      return
    }

    let timeLimitParsed: number | undefined
    if (timeLimitMinutes.trim()) {
      const n = parseInt(timeLimitMinutes.trim(), 10)
      if (Number.isNaN(n) || n < 1 || n > 1440) {
        setError(t('assignDialog.errorTimeLimit'))
        return
      }
      timeLimitParsed = n
    }

    try {
      setLoading(true)
      setError(null)

      await createAssignment(typeof classId === 'number' ? classId : parseInt(String(classId), 10), {
        set_id: studySet.id,
        due_date: dueDate.trim() || undefined,
        time_limit_minutes: timeLimitParsed,
        practice_feedback_mode: feedbackMode,
      })

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignDialog.submitFailed'))
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('assignToClassDialog.title')}
        {studySet ? ` — ${studySet.title}` : ''}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('assignToClassDialog.intro')}
          </Typography>

          {loadingClasses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth required>
              <InputLabel>{t('assignToClassDialog.classLabel')}</InputLabel>
              <Select
                value={classId}
                onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
                label={t('assignToClassDialog.classLabel')}
              >
                {classes.length === 0 ? (
                  <MenuItem disabled>{t('assignToClassDialog.noClasses')}</MenuItem>
                ) : (
                  classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.class_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          <TextField
            label={t('assignDialog.dueLabel')}
            type="datetime-local"
            fullWidth
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText={t('assignDialog.dueHelper')}
          />

          <TextField
            label={t('assignDialog.timeLimitLabel')}
            type="number"
            fullWidth
            inputProps={{ min: 1, max: 1440 }}
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(e.target.value)}
            placeholder="30"
            helperText={t('assignDialog.timeLimitHelper')}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{t('common.minutesAbbr')}</InputAdornment>
              ),
            }}
          />

          <FormControl component="fieldset">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('assignDialog.feedbackTitle')}
            </Typography>
            <RadioGroup
              value={feedbackMode}
              onChange={(e) => setFeedbackMode(e.target.value as 'immediate' | 'end_only')}
            >
              <FormControlLabel
                value="end_only"
                control={<Radio size="small" />}
                label={t('assignDialog.feedbackEndOnly')}
              />
              <FormControlLabel
                value="immediate"
                control={<Radio size="small" />}
                label={t('assignDialog.feedbackImmediate')}
              />
            </RadioGroup>
          </FormControl>

          {error ? (
            <Alert severity="error" sx={{ mt: 0.5 }}>
              {error}
            </Alert>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('assignDialog.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !studySet || !classId || loadingClasses}
        >
          {loading ? t('assignDialog.submitting') : t('assignDialog.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
