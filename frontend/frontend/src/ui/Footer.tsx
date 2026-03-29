import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.png';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <Box component="footer" sx={{ bgcolor: 'neutral.50', py: 4 }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Link
              component={RouterLink}
              to="/"
              underline="none"
              aria-label={t('nav.home')}
              sx={{ display: 'inline-flex', lineHeight: 0, borderRadius: 1 }}
            >
              <Box
                component="img"
                src={logo}
                alt=""
                sx={{ width: 28, height: 28, borderRadius: 1, display: 'block' }}
              />
            </Link>
            <Typography variant="body2" sx={{ color: 'neutral.500' }}>
              {t('footer.copyright')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={3} sx={{ color: 'neutral.500' }}>
            <Link href="#" underline="hover" sx={{ color: 'neutral.500' }}>
              {t('footer.contacts')}
            </Link>
            <Link href="#" underline="hover" sx={{ color: 'neutral.500' }}>
              {t('footer.privacy')}
            </Link>
            <Link href="#" underline="hover" sx={{ color: 'neutral.500' }}>
              {t('footer.terms')}
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
