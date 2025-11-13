import { Fragment } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { AppBar, Box, Button, Container, Divider, IconButton, Link, Stack, Toolbar, Typography } from '@mui/material'
import Grid from '@mui/material/Grid'
import { ArrowRight } from 'lucide-react'
import MenuIcon from '@mui/icons-material/Menu'
import heroIllustration from '../assets/landing-illustration.png'
import logo from '../assets/logo.png'

const featureItems = [
  {
    title: '01 Personalized Learning',
    description: 'Get personalized suggestions',
  },
  {
    title: '02 Track Progress',
    description: 'Analytics & Stats',
  },
  {
    title: '03 Gamified Motivation',
    description: 'Get trophies and be at the top of the leaderboard',
  },
]

const steps = [
  { title: 'Create an account' },
  { title: 'Practice & review' },
  { title: 'Improve with AI' },
]

export default function LandingPage() {
  return (
    <Box sx={{ bgcolor: 'neutral.50', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{ bgcolor: 'primary.main', color: 'neutral.50', borderRadius: 0 }}
      >
        <Toolbar sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
            <Box component="img" src={logo} alt="Nova Edu logo" sx={{ width: 32, height: 32, borderRadius: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.50' }}>
              Nova Edu
            </Typography>
          </Stack>
          <Stack direction="row" spacing={{ xs: 1, sm: 3 }} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Link component={RouterLink} to="/" underline="none" sx={{ color: 'neutral.50', fontWeight: 500 }}>
              Home
            </Link>
            <Link component={RouterLink} to="#" underline="none" sx={{ color: 'neutral.50', fontWeight: 500 }}>
              Dashboard
            </Link>
            <Link component={RouterLink} to="/login" underline="none" sx={{ color: 'neutral.50', fontWeight: 500 }}>
              Login
            </Link>
            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              sx={{ bgcolor: 'neutral.50', color: 'primary.main', '&:hover': { bgcolor: 'primary.50' } }}
            >
              Sign Up
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' }, ml: 3 }}>
            <Button
              variant="outlined"
              size="small"
              sx={{ borderColor: 'neutral.50', color: 'neutral.50', '&:hover': { borderColor: 'neutral.50', bgcolor: 'primary.300' } }}
            >
              English
            </Button>
          </Stack>
          <IconButton sx={{ display: { xs: 'flex', md: 'none' }, color: 'neutral.50', ml: 1 }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ flexGrow: 1, pt: { xs: 3, md: 5 }, pb: { xs: 5, md: 8 } }}>
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
              Learn Smarter, Not Longer
            </Typography>
            <Typography variant="body1" sx={{ color: 'neutral.500', mb: 4 }}>
              Personalized AI-powered study platform to help students master topics efficiently and stay motivated. With
              Nova Edu, you can save your time and efforts.
            </Typography>
            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              size="large"
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.300' }, px: 4, py: 1.5, fontSize: '1.125rem' }}
            >
              Get Started
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box component="img" src={heroIllustration} alt="Student working illustration" sx={{ width: '100%', maxWidth: 400, mx: 'auto', display: 'block' }} />
          </Grid>
        </Grid>

        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
            Features
          </Typography>
          <Grid container spacing={3}>
            {featureItems.map((item) => (
              <Grid size={{ xs: 12, md: 4 }} key={item.title}>
                <Box
                  sx={{
                    bgcolor: 'primary.50',
                    borderRadius: '20px',
                    p: 3,
                    height: '100%',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'neutral.500' }}>
                    {item.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
            How it works
          </Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2, md: 3 }}
            alignItems="center"
            justifyContent="center"
            sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}
          >
            {steps.map((step, index) => (
              <Fragment key={step.title}>
                <Box
                  sx={{
                    bgcolor: 'primary.50',
                    borderRadius: '20px',
                    p: 3,
                    minWidth: { xs: '100%', md: 220 },
                    height: '100%',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Typography
                      variant="h4"
                      sx={{ color: 'neutral.700', fontWeight: 700, display: 'flex', alignItems: 'center' }}
                    >
                      {index + 1}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                      {step.title}
                    </Typography>
                  </Stack>
                </Box>
                {index < steps.length - 1 && (
                  <Box
                    sx={{
                      display: { xs: 'none', md: 'flex' },
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'neutral.500',
                    }}
                  >
                    <ArrowRight size={24} />
                  </Box>
                )}
              </Fragment>
            ))}
          </Stack>
        </Box>
      </Container>

      <Divider />

      <Box component="footer" sx={{ bgcolor: 'neutral.50', py: 4 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box component="img" src={logo} alt="Nova Edu logo" sx={{ width: 28, height: 28, borderRadius: 1 }} />
              <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                © 2025 AED Platform
              </Typography>
            </Stack>
            <Stack direction="row" spacing={3} sx={{ color: 'neutral.500' }}>
              <Link href="#" underline="hover" sx={{ color: 'neutral.500' }}>
                Contacts
              </Link>
              <Link href="#" underline="hover" sx={{ color: 'neutral.500' }}>
                Privacy
              </Link>
              <Link href="#" underline="hover" sx={{ color: 'neutral.500' }}>
                Terms of Service
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
