import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import loginIllustration from '../assets/login-illustration.png';
import logo from '../assets/logo.png';
import { login } from '../api/authApi';

// Hardcoded so OAuth buttons always work even if API_URL fails to load (flow=login for login page)
const GOOGLE_OAUTH_URL = 'http://localhost:8000/auth/google/start?flow=login';
const GITHUB_OAUTH_URL = 'http://localhost:8000/auth/github/start?flow=login';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [oauthErrorShown, setOauthErrorShown] = useState(false);
  const [noAccountShown, setNoAccountShown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if (!email.trim()) {
      alert(t('auth.login.alertEmail'));
      return;
    }

    if (!password) {
      alert(t('auth.login.alertPassword'));
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password, rememberMe);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t('auth.login.loginFailed');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show OAuth errors from URL and clear param so it doesn't persist on refresh
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'oauth_failed') {
      setOauthErrorShown(true);
      setSearchParams({}, { replace: true });
    } else if (error === 'no_account') {
      setNoAccountShown(true);
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
          maxWidth: 1000,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Grid container>
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              bgcolor: 'primary.50',
              p: { xs: 4, md: 6 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Box component="img" src={logo} alt="Nova Edu logo" sx={{ width: 40, height: 40 }} />
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'neutral.700' }}>
              {t('auth.login.title')}
            </Typography>
            {oauthErrorShown && (
              <Alert severity="error" onClose={() => setOauthErrorShown(false)}>
                {t('auth.login.oauthFailed')}
              </Alert>
            )}
            {noAccountShown && (
              <Alert severity="info" onClose={() => setNoAccountShown(false)}>
                {t('auth.login.noOAuthAccount')}
              </Alert>
            )}
            <Stack spacing={3}>
              <TextField
                label={t('auth.login.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                InputLabelProps={{ sx: { color: 'neutral.500' } }}
              />
              <TextField
                label={t('auth.login.password')}
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
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{ color: 'neutral.500' }}
                  />
                }
                label={t('auth.login.rememberMe')}
                sx={{ color: 'neutral.500' }}
              />
              <Button
                variant="contained"
                size="large"
                disabled={loading}
                onClick={handleLogin}
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.300' } }}
              >
                {loading ? t('auth.login.loggingIn') : t('auth.login.login')}
              </Button>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                  {t('auth.login.orLoginWith')}
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Box
                    component="a"
                    href={GOOGLE_OAUTH_URL}
                    target="_self"
                    rel="noopener noreferrer"
                    sx={{
                      border: '1px solid',
                      borderColor: 'neutral.300',
                      color: 'neutral.700',
                      borderRadius: 1,
                      px: 2,
                      py: 1.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      textDecoration: 'none',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <GoogleIcon /> Google
                  </Box>
                  <Box
                    component="a"
                    href={GITHUB_OAUTH_URL}
                    target="_self"
                    rel="noopener noreferrer"
                    sx={{
                      border: '1px solid',
                      borderColor: 'neutral.300',
                      color: 'neutral.700',
                      borderRadius: 1,
                      px: 2,
                      py: 1.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      textDecoration: 'none',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <GitHubIcon /> GitHub
                  </Box>
                </Stack>
                <Typography variant="caption" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                  {t('auth.login.orOpen')}{' '}
                  <Link component="a" href={GOOGLE_OAUTH_URL} target="_self" sx={{ fontWeight: 600 }}>
                    Google
                  </Link>
                  {' · '}
                  <Link component="a" href={GITHUB_OAUTH_URL} target="_self" sx={{ fontWeight: 600 }}>
                    GitHub
                  </Link>
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                {t('auth.login.noAccount')}{' '}
                <Link
                  component={RouterLink}
                  to="/signup"
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
                  {t('auth.login.signUp')}
                </Link>
              </Typography>
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                <Link
                  component={RouterLink}
                  to="/pwdreset"
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </Typography>
            </Stack>
          </Grid>
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
              src={loginIllustration}
              alt="Login illustration"
              sx={{ width: '100%', maxWidth: 360 }}
            />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
