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
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { updateClass, type ClassUpdate, type ClassOut } from '../api/studySetsApi'
import { translateSubjectOrClassName } from '../utils/recommendationI18n'

interface EditClassDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  classData: ClassOut | null
}

const SUBJECT_VALUES = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
const LEVEL_VALUES = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

function levelMenuLabel(value: string, t: TFunction): string {
  const keys: Record<string, string> = {
    'Grade 7': 'classes.levelGrade7',
    'Grade 8': 'classes.levelGrade8',
    'Grade 9': 'classes.levelGrade9',
    'Grade 10': 'classes.levelGrade10',
    'Grade 11': 'classes.levelGrade11',
    'Grade 12': 'classes.levelGrade12',
  }
  const k = keys[value]
  return k ? t(k) : value
}

export default function EditClassDialog({ open, onClose, onSuccess, classData }: EditClassDialogProps) {
  const { t } = useTranslation()
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (classData) {
      setClassName(classData.class_name || '')
      setSubject(classData.subject || '')
      setLevel(classData.level || '')
      setDescription(classData.description || '')
    }
  }, [classData])

  const handleSubmit = async () => {
    if (!classData) return

    if (!className.trim()) {
      setError(t('dialogs.createClass.classNameRequired'))
      return
    }
    if (!subject) {
      setError(t('dialogs.createClass.subjectRequired'))
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data: ClassUpdate = {
        class_name: className.trim(),
        subject,
        level: level || undefined,
        description: description.trim() || undefined,
      }

      await updateClass(classData.id, data)

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dialogs.editClass.updateFailed'))
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
      <DialogTitle>{t('dialogs.editClass.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label={t('dialogs.createClass.className')}
            required
            fullWidth
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder={t('dialogs.createClass.classNamePlaceholder')}
          />

          <FormControl fullWidth required>
            <InputLabel>{t('classes.subject')}</InputLabel>
            <Select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              label={t('classes.subject')}
            >
              {SUBJECT_VALUES.map((sub) => (
                <MenuItem key={sub} value={sub}>
                  {translateSubjectOrClassName(sub, t)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>{t('dialogs.createClass.levelGrade')}</InputLabel>
            <Select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              label={t('dialogs.createClass.levelGrade')}
            >
              <MenuItem value="">{t('common.none')}</MenuItem>
              {LEVEL_VALUES.map((lvl) => (
                <MenuItem key={lvl} value={lvl}>
                  {levelMenuLabel(lvl, t)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t('dialogs.createClass.description')}
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('dialogs.createClass.descriptionPlaceholder')}
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
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !className.trim() || !subject}
        >
          {loading ? t('dialogs.editClass.saving') : t('dialogs.editClass.saveChanges')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
