import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getMe, redirectToLogin } from '../api/authApi';

/** Verifies session before rendering dashboard routes; redirects to sign-in if unauthenticated. */
export default function RequireAuth() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getMe()
      .then(() => setReady(true))
      .catch((err) => {
        if (err instanceof Error && err.message === 'Not authenticated') {
          redirectToLogin();
          return;
        }
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  return <Outlet />;
}
