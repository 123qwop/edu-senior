import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Alert,
  Link,
  Paper,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) =>({
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: theme.spacing(2),
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    maxWidth: 450,
    margin: '0 auto'
}));

interface ForgotPwdProps {
}

type Step = 'email' | 'success';

const ForgotPwdPage: React.FC<ForgotPwdProps> = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<Step>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleToLogin = () => {
        navigate('/login');
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (!email || !email.includes('@')) {
                throw new Error('Please enter a valid email address!');
            }

            setStep('success');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong!!!");
        }
        finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setEmail('');
        setStep('email');
        setError('');
    };

    return (
        <Container component="main" maxWidth="sm">
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                }}
            >
                <StyledPaper>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={handleToLogin}
                        sx={{ alignSelf: 'flex-start', mb: 2}}
                    >
                        Back to login
                    </Button>

                    <Typography 
                        component="h1" 
                        variant="h4"
                        gutterBottom fontWeight="bold"
                        align='center'
                        >
                            Forgot password?
                    </Typography>

                    <Typography
                        variant="body1"
                        color='text.secondary'
                        align='center'
                        sx={{ mb:3 }}
                        >
                            {step === 'email'
                                ? "Enter your email address and we will send you instructions to reset your password"
                                : "Check your email for further instructions"
                            }
                    </Typography>

                    {error && (
                        <Alert severity='error' sx={{ width: '100%', mb:2 }}>
                            {error}
                        </Alert>
                    )}

                    {step === 'email' ? (
                        <Box component="form" onSubmit={handleSubmit} sx={{ mt:2, width: '100%' }}>
                            <TextField
                                margin='normal'
                                required
                                fullWidth
                                id='email'
                                label="Email address"
                                name='email'
                                autoComplete='email'
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                variant='outlined'
                                disabled={loading}
                            />
                            <Button
                                type='submit'
                                fullWidth
                                variant='contained'
                                size='large'
                                disabled={loading}
                                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.300' } }}
                            >
                                {loading ? <CircularProgress size={24} /> : "Send reset instructions"}
                            </Button>
                        </Box>
                    ) : (
                        <Box sx={{ mt:2, width: '100%', textAlign: 'center'}}>
                            <Alert severity='success' sx={{ width: '100%', mb:3 }}>
                                Password reset instrucitons have been sent to {email}
                            </Alert>
                            <Button
                                fullWidth
                                variant='outlined'
                                onClick={handleReset}
                                sx={{ mb:2 }}
                            >
                                Try another email
                            </Button>
                        </Box>
                    )}

                    <Box sx={{ mt:3, textAlign: 'center'}}>
                        <Typography
                            variant='body2'
                            color='text.secondary'
                        >
                            Remember your password?{' '}
                            <Link
                                component='button'
                                type='button'
                                variant='body2'
                                onClick={handleToLogin}
                                sx={{ fontWeight: 'bold', textDecoration: 'none'}}
                            >
                                Back to Login
                            </Link>
                        </Typography>
                    </Box>
                </StyledPaper>
            </Box>
        </Container>
    );
};

export default ForgotPwdPage;
