import { Box, Typography, Paper, Button } from '@mui/material';
import Grid from '@mui/material/Grid';
export default function Statistics() {
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        Statistics
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
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'inherit' }}>
                  Nurassyl Mukan
                </Typography>
                <Typography sx={{ opacity: 0.9, color: 'inherit' }}>Class A</Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontWeight: 600, color: 'inherit' }}>📈 Key Statistics</Typography>
                  <Typography sx={{ color: 'inherit' }}>Total Study Sets: 5</Typography>
                  <Typography sx={{ color: 'inherit' }}>Average Quiz Score: 70%</Typography>
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
              <Typography variant="h6" sx={{ color: 'inherit' }}>Suggestion of the day</Typography>
              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  borderRadius: 2,
                }}
              >
                <Typography sx={{ color: 'inherit' }}>
                  You should repeat Databases Study Set once more to get a higher score
                </Typography>
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
              <Typography variant="h6" sx={{ mb: 2, color: 'inherit' }}>
                Leaderboard · Databases ▼
              </Typography>

              <Typography sx={{ color: 'inherit' }}>1. Ayan — 75%</Typography>
              <Typography sx={{ color: 'inherit' }}>2. Nurassyl — 70%</Typography>
              <Typography sx={{ color: 'inherit' }}>3. Dias — 69%</Typography>
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
              <Typography variant="h6" sx={{ mb: 2, color: 'inherit' }}>
                My Study Sets
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                  color: 'inherit',
                }}
              >
                <Typography sx={{ color: 'inherit' }}>Databases</Typography>
                <Button variant="contained" color="inherit" sx={{ color: 'text.primary' }}>
                  Study
                </Button>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'inherit',
                }}
              >
                <Typography sx={{ color: 'inherit' }}>Machine Learning</Typography>
                <Button variant="contained" color="inherit" sx={{ color: 'text.primary' }}>
                  Study
                </Button>
              </Box>

              <Button
                fullWidth
                sx={{
                  mt: 3,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
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
  );
}
