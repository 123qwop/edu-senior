import { Box, Container, Link, Stack, Typography } from '@mui/material';
import logo from '../assets/logo.png';

export default function Footer() {
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
            <Box
              component="img"
              src={logo}
              alt="Nova Edu logo"
              sx={{ width: 28, height: 28, borderRadius: 1 }}
            />
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
  );
}
