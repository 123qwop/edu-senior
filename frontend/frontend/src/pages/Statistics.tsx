import { Box, Typography, Paper, Button } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTranslation } from 'react-i18next';

export default function Statistics() {
  const { t } = useTranslation();
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        {t('statistics.title')}
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
                  <Typography sx={{ fontWeight: 600, color: 'inherit' }}>{t('statistics.keyStats')}</Typography>
                  <Typography sx={{ color: 'inherit' }}>{t('statistics.totalSets', { count: 5 })}</Typography>
                  <Typography sx={{ color: 'inherit' }}>{t('statistics.avgScore', { pct: 70 })}</Typography>
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
              <Typography variant="h6" sx={{ color: 'inherit' }}>{t('statistics.suggestionDay')}</Typography>
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
                  {t('statistics.suggestionBody')}
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
                {t('statistics.leaderboard')}
              </Typography>

              <Typography sx={{ color: 'inherit' }}>{t('statistics.rank1')}</Typography>
              <Typography sx={{ color: 'inherit' }}>{t('statistics.rank2')}</Typography>
              <Typography sx={{ color: 'inherit' }}>{t('statistics.rank3')}</Typography>
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
                {t('statistics.myStudySets')}
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
                <Typography sx={{ color: 'inherit' }}>{t('statistics.databases')}</Typography>
                <Button variant="contained" color="inherit" sx={{ color: 'text.primary' }}>
                  {t('common.study')}
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
                <Typography sx={{ color: 'inherit' }}>{t('statistics.machineLearning')}</Typography>
                <Button variant="contained" color="inherit" sx={{ color: 'text.primary' }}>
                  {t('common.study')}
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
                {t('statistics.createNewSet')}
              </Button>
            </Paper>
          </Grid>
        </Grid>
    </Box>
  );
}
