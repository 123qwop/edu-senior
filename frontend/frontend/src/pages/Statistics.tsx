import { Box, Typography, Paper, Button } from '@mui/material';
import Header from '../ui/Header';
import Grid from '@mui/material/Grid';
import Footer from '../ui/Footer';
export default function Statistics() {
  return (
    <Box sx={{ bgcolor: 'neutral.50', minHeight: '100vh' }}>
      <Header />

      <Box sx={{ px: 4, py: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
          Welcome back, Nurassyl!
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Nurassyl Mukan
                </Typography>
                <Typography sx={{ opacity: 0.9 }}>Class A</Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontWeight: 600 }}>📈 Key Statistics</Typography>
                  <Typography>Total Study Sets: 5</Typography>
                  <Typography>Average Quiz Score: 70%</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'secondary.main',
                color: 'white',
              }}
            >
              <Typography variant="h6">Suggestion of the day</Typography>
              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'white',
                  color: 'black',
                  borderRadius: 2,
                }}
              >
                You should repeat Databases Study Set once more to get a higher score
              </Paper>
            </Paper>
          </Grid>

          {/* Leaderboard */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'secondary.light',
                color: 'white',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                Leaderboard · Databases ▼
              </Typography>

              <Typography>1. Ayan — 75%</Typography>
              <Typography>2. Nurassyl — 70%</Typography>
              <Typography>3. Dias — 69%</Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'primary.light',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                My Study Sets
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                  color: 'white',
                }}
              >
                <Typography>Databases</Typography>
                <Button variant="contained" color="inherit" sx={{ color: 'black' }}>
                  Study
                </Button>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'white',
                }}
              >
                <Typography>Machine Learning</Typography>
                <Button variant="contained" color="inherit" sx={{ color: 'black' }}>
                  Study
                </Button>
              </Box>

              <Button
                fullWidth
                sx={{
                  mt: 3,
                  bgcolor: 'white',
                  color: 'black',
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                + Create New Study Set
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <Footer />
    </Box>
  );
}
