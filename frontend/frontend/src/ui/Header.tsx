import { AppBar, Stack, Toolbar, Typography, Link, Button, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import logo from '../assets/logo.png';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t } = useTranslation();
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: 'primary.main', color: 'neutral.50', borderRadius: 0 }}
    >
      <Toolbar
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          // Reserve space for fixed LanguageSwitcher (App.tsx) so it does not cover Sign up / Login
          pr: { xs: 20, sm: 28, md: 38 },
          boxSizing: 'border-box',
        }}
      >
        <Link
          component={RouterLink}
          to="/"
          underline="none"
          aria-label={t('nav.home')}
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1.5,
            color: 'inherit',
          }}
        >
          <Box
            component="img"
            src={logo}
            alt=""
            sx={{ width: 32, height: 32, borderRadius: 1, flexShrink: 0 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.50' }}>
            {t('header.brand')}
          </Typography>
        </Link>
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 2 }}
          alignItems="center"
          sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0, mr: { md: 1 } }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            sx={{ color: 'neutral.50', fontWeight: 500 }}
          >
            {t('nav.home')}
          </Link>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            sx={{
              borderColor: 'neutral.50',
              color: 'neutral.50',
              bgcolor: 'transparent',
              '&:hover': {
                borderColor: 'neutral.50',
                bgcolor: 'rgba(250, 250, 250, 0.1)',
              },
            }}
          >
            {t('auth.login.login')}
          </Button>
          <Button
            component={RouterLink}
            to="/signup"
            variant="contained"
            sx={{
              bgcolor: 'neutral.50',
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.50' },
            }}
          >
            {t('header.signUp')}
          </Button>
        </Stack>
        <IconButton sx={{ display: { xs: 'flex', md: 'none' }, color: 'neutral.50', ml: 1 }}>
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
