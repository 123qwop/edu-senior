import { useState, useEffect } from 'react'
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
      setError(err instanceof Error ? err.message : 'Failed to load profile')
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
        setError('Password must be at least 6 characters long')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
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
      setError(err instanceof Error ? err.message : 'Failed to update profile')
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
        Settings
      </Typography>

      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'neutral.200' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
          Profile Information
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
            Profile updated successfully!
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.full_name}
                onChange={handleChange('full_name')}
                required
                variant="outlined"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Email"
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
                Change Password (leave blank to keep current password)
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                variant="outlined"
                helperText="Leave blank to keep current password"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                variant="outlined"
                error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                helperText={
                  formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
                    ? 'Passwords do not match'
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
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={fetchUserData}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Paper elevation={0} sx={{ p: 4, mt: 4, border: '1px solid', borderColor: 'neutral.200' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 1 }}>
          Delete account
        </Typography>
        <Typography variant="body2" sx={{ color: 'neutral.600', mb: 2 }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleting}
        >
          Delete my account
        </Button>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete your account and all your data (study sets, progress, classes, etc.).
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              setDeleting(true)
              try {
                await deleteAccount()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete account')
                setDeleting(false)
                setDeleteDialogOpen(false)
              }
            }}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

