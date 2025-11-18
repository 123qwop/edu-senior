import { AppBar, Stack, Toolbar, Typography, Link, Button, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import logo from '../assets/logo.png';
import { Link as RouterLink } from 'react-router-dom';

export default function Header() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: 'primary.main', color: 'neutral.50', borderRadius: 0 }}
    >
      <Toolbar sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
          <Box
            component="img"
            src={logo}
            alt="Nova Edu logo"
            sx={{ width: 32, height: 32, borderRadius: 1 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.50' }}>
            Nova Edu
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 3 }}
          alignItems="center"
          sx={{ display: { xs: 'none', md: 'flex' } }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            sx={{ color: 'neutral.50', fontWeight: 500 }}
          >
            Home
          </Link>
          <Link
            component={RouterLink}
            to="#"
            underline="none"
            sx={{ color: 'neutral.50', fontWeight: 500 }}
          >
            Dashboard
          </Link>
          <Link
            component={RouterLink}
            to="/login"
            underline="none"
            sx={{ color: 'neutral.50', fontWeight: 500 }}
          >
            Login
          </Link>
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
            Sign Up
          </Button>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ display: { xs: 'none', md: 'flex' }, ml: 3 }}
        >
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'neutral.50',
              color: 'neutral.50',
              '&:hover': { borderColor: 'neutral.50', bgcolor: 'primary.300' },
            }}
          >
            English
          </Button>
        </Stack>
        <IconButton sx={{ display: { xs: 'flex', md: 'none' }, color: 'neutral.50', ml: 1 }}>
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
