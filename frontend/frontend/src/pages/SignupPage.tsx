import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import signupIllustration from '../assets/signup-illustration.png';
import logo from '../assets/logo.png';
import { register, login, API_URL } from '../api/authApi';

const GOOGLE_OAUTH_URL = `${API_URL}/auth/google/start`;
const GITHUB_OAUTH_URL = `${API_URL}/auth/github/start`;

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accountExistsShown, setAccountExistsShown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [oauthRoleDialog, setOauthRoleDialog] = useState<'google' | 'github' | null>(null);

  const startOAuthSignup = (provider: 'google' | 'github', chosenRole: 'student' | 'teacher') => {
    setOauthRoleDialog(null);
    const base = provider === 'google' ? GOOGLE_OAUTH_URL : GITHUB_OAUTH_URL;
    window.location.href = `${base}?flow=signup&role=${encodeURIComponent(chosenRole)}`;
  };
  const handleSignup = async () => {
    if (!fullName.trim()) {
      alert('Please enter your full name');
      return;
    }

    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Register the user
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role: role,
      });

      // Automatically log in the user after registration
      await login(email.trim(), password);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('error') === 'account_exists') {
      setAccountExistsShown(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <Container
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'neutral.50',
        py: 6,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          width: '100%',
          maxWidth: 1100,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Grid container>
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              bgcolor: 'neutral.50',
              p: { xs: 4, md: 6 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={signupIllustration}
              alt="Signup illustration"
              sx={{ width: '100%', maxWidth: 380 }}
            />
          </Grid>
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              bgcolor: 'primary.50',
              p: { xs: 4, md: 6 },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box component="img" src={logo} alt="Nova Edu logo" sx={{ width: 40, height: 40 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                {t('auth.signup.title')}
              </Typography>
            </Stack>
            {accountExistsShown && (
              <Alert severity="info" onClose={() => setAccountExistsShown(false)}>
                {t('auth.signup.accountExists')}
              </Alert>
            )}
            <Stack spacing={3}>
              <TextField
                label={t('auth.signup.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                fullWidth
                InputLabelProps={{ sx: { color: 'neutral.500' } }}
              />
              <TextField
                label={t('auth.signup.email')}
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputLabelProps={{ sx: { color: 'neutral.500' } }}
              />
              <TextField
                label={t('auth.signup.password')}
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputLabelProps={{ sx: { color: 'neutral.500' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label={t('auth.signup.confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputLabelProps={{ sx: { color: 'neutral.500' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOffOutlinedIcon />
                        ) : (
                          <VisibilityOutlinedIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'neutral.500' }}>{t('auth.signup.iAmA')}</InputLabel>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  label={t('auth.signup.iAmA')}
                  sx={{ color: 'neutral.700' }}
                >
                  <MenuItem value="student">{t('auth.signup.student')}</MenuItem>
                  <MenuItem value="teacher">{t('auth.signup.teacher')}</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Checkbox sx={{ color: 'neutral.500' }} />}
                label={
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    {t('auth.signup.agreeTerms')}{' '}
                    <Link href="#" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      {t('auth.signup.termsLink')}
                    </Link>
                  </Typography>
                }
              />
              <Button
                variant="contained"
                size="large"
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.300' } }}
                onClick={handleSignup}
                disabled={loading}
              >
                {loading ? t('auth.signup.creating') : t('auth.signup.createAccount')}
              </Button>
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                {t('auth.signup.orSignUpWith')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => setOauthRoleDialog('google')}
                  sx={{
                    borderColor: 'neutral.300',
                    color: 'neutral.700',
                    '&:hover': { borderColor: 'neutral.500', bgcolor: 'action.hover' },
                  }}
                >
                  Google
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  onClick={() => setOauthRoleDialog('github')}
                  sx={{
                    borderColor: 'neutral.300',
                    color: 'neutral.700',
                    '&:hover': { borderColor: 'neutral.500', bgcolor: 'action.hover' },
                  }}
                >
                  GitHub
                </Button>
              </Stack>
              <Dialog open={oauthRoleDialog !== null} onClose={() => setOauthRoleDialog(null)}>
                <DialogTitle>
                  {t('auth.signup.dialogTitle', {
                    provider:
                      oauthRoleDialog === 'github' ? t('common.github') : t('common.google'),
                  })}
                </DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ color: 'neutral.600' }}>
                    {t('auth.signup.dialogBody', {
                      provider:
                        oauthRoleDialog === 'github' ? t('common.github') : t('common.google'),
                    })}
                  </Typography>
                </DialogContent>
                <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => oauthRoleDialog && startOAuthSignup(oauthRoleDialog, 'student')}
                    sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.300' } }}
                  >
                    {t('auth.signup.continueAsStudent')}
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => oauthRoleDialog && startOAuthSignup(oauthRoleDialog, 'teacher')}
                    sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.300' } }}
                  >
                    {t('auth.signup.continueAsTeacher')}
                  </Button>
                  <Button variant="text" onClick={() => setOauthRoleDialog(null)}>
                    {t('auth.signup.cancel')}
                  </Button>
                </DialogActions>
              </Dialog>
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                {t('auth.signup.alreadyHaveAccount')}{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
                  {t('auth.signup.login')}
                </Link>
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
