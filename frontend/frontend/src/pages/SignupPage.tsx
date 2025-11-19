import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Container,
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
import { register, login } from '../api/authApi';

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
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
                Sign Up to Access AED
              </Typography>
            </Stack>
            <Stack spacing={3}>
              <TextField
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                fullWidth
                InputLabelProps={{ sx: { color: 'neutral.500' } }}
              />
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <TextField
                label="Confirm Password"
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
                <InputLabel sx={{ color: 'neutral.500' }}>I am a</InputLabel>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  label="I am a"
                  sx={{ color: 'neutral.700' }}
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Checkbox sx={{ color: 'neutral.500' }} />}
                label={
                  <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                    Agree to{' '}
                    <Link href="#" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      Terms &amp; Privacy Policy
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
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                or Sign Up with
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
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
              <Typography variant="body2" sx={{ color: 'neutral.500', textAlign: 'center' }}>
                Already have an account?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
                  Login
                </Link>
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
