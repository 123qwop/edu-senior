import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ArrowRight } from 'lucide-react';
import heroIllustration from '../assets/landing-illustration.png';
import Header from '../ui/Header';
import Footer from '../ui/Footer';

const FEATURE_KEYS = [
  { titleKey: 'landing.feature1Title', descKey: 'landing.feature1Desc' },
  { titleKey: 'landing.feature2Title', descKey: 'landing.feature2Desc' },
  { titleKey: 'landing.feature3Title', descKey: 'landing.feature3Desc' },
] as const;

const STEP_KEYS = ['landing.step1', 'landing.step2', 'landing.step3'] as const;

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <Box
      sx={{ bgcolor: 'neutral.50', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <Header />
      <Container maxWidth="lg" sx={{ flexGrow: 1, pt: { xs: 3, md: 5 }, pb: { xs: 5, md: 8 } }}>
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
              {t('landing.heroTitle')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'neutral.500', mb: 4 }}>
              {t('landing.heroSubtitle')}
            </Typography>
            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.300' },
                px: 4,
                py: 1.5,
                fontSize: '1.125rem',
              }}
            >
              {t('landing.getStarted')}
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              component="img"
              src={heroIllustration}
              alt={t('landing.illustrationAlt')}
              sx={{ width: '100%', maxWidth: 400, mx: 'auto', display: 'block' }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
            {t('landing.featuresTitle')}
          </Typography>
          <Grid container spacing={3}>
            {FEATURE_KEYS.map((item) => (
              <Grid size={{ xs: 12, md: 4 }} key={item.titleKey}>
                <Box
                  sx={{
                    bgcolor: 'primary.50',
                    borderRadius: '20px',
                    p: 3,
                    height: '100%',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 1 }}>
                    {t(item.titleKey)}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'neutral.500' }}>
                    {t(item.descKey)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'neutral.700', mb: 3 }}>
            {t('landing.howItWorks')}
          </Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2, md: 3 }}
            alignItems="center"
            justifyContent="center"
            sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}
          >
            {STEP_KEYS.map((stepKey, index) => (
              <Fragment key={stepKey}>
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
                      sx={{
                        color: 'neutral.700',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {index + 1}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                      {t(stepKey)}
                    </Typography>
                  </Stack>
                </Box>
                {index < STEP_KEYS.length - 1 && (
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
      <Footer />
    </Box>
  );
}
