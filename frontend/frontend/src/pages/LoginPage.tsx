import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
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

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }

    if (!password) {
      alert('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };
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
              Login to Access AED
            </Typography>
            <Stack spacing={3}>
              <TextField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                InputLabelProps={{ sx: { color: 'neutral.500' } }}
              />
              <TextField
                label="Password"
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
                control={<Checkbox defaultChecked={false} sx={{ color: 'neutral.500' }} />}
                label="Remember me"
                sx={{ color: 'neutral.500' }}
              />
              <Button
                variant="contained"
                size="large"
                disabled={loading}
                onClick={handleLogin}
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.300' } }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                  or Login with
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  justifyContent="center"
                >
                  <Button
                    variant="outlined"
                    startIcon={<GoogleIcon />}
                    sx={{ color: 'neutral.700', borderColor: 'neutral.300' }}
                  >
                    Google
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<GitHubIcon />}
                    sx={{ color: 'neutral.700', borderColor: 'neutral.300' }}
                  >
                    GitHub
                  </Button>
                </Stack>
              </Stack>
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                Don&apos;t have an account?{' '}
                <Link
                  component={RouterLink}
                  to="/signup"
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
                  Sign up
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
