import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { getMe, updateProfile, deleteAccount, type UserUpdate } from '../api/authApi'

export default function Settings() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)
      const userData = await getMe()
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        password: '',
        confirmPassword: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
    setSuccess(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate password if provided
    if (formData.password) {
      if (formData.password.length < 6) {
        setError(t('settings.passwordShort'))
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t('settings.passwordMismatch'))
        return
      }
    }

    try {
      setSaving(true)
      const updateData: UserUpdate = {
        full_name: formData.full_name,
        email: formData.email,
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      await updateProfile(updateData)
      setSuccess(true)
      // Clear password fields after successful update
      setFormData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4, px: 4, flexGrow: 1, maxWidth: '800px' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        {t('settings.title')}
      </Typography>

      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'neutral.200' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
          {t('settings.profileInfo')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
            {t('settings.profileUpdated')}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('settings.fullName')}
                value={formData.full_name}
                onChange={handleChange('full_name')}
                required
                variant="outlined"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('settings.email')}
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                variant="outlined"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ color: 'neutral.600', mb: 2 }}>
                {t('settings.changePasswordHint')}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('settings.newPassword')}
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                variant="outlined"
                helperText={t('settings.helperKeepPassword')}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('settings.confirmNewPassword')}
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                variant="outlined"
                error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                helperText={
                  formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
                    ? t('settings.passwordMismatch')
                    : ''
                }
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  {saving ? t('common.saving') : t('settings.saveChanges')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={fetchUserData}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Paper elevation={0} sx={{ p: 4, mt: 4, border: '1px solid', borderColor: 'neutral.200' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 1 }}>
          {t('settings.deleteAccountTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'neutral.600', mb: 2 }}>
          {t('settings.deleteAccountBody')}
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleting}
        >
          {t('settings.deleteMyAccount')}
        </Button>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>{t('settings.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('settings.deleteConfirmBody')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              setDeleting(true)
              try {
                await deleteAccount()
              } catch (err) {
                setError(err instanceof Error ? err.message : t('settings.deleteFailed'))
                setDeleting(false)
                setDeleteDialogOpen(false)
              }
            }}
            disabled={deleting}
          >
            {deleting ? t('settings.deleting') : t('settings.deleteAccount')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

