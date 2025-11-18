import { useState, useEffect } from 'react'
import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import PersonIcon from '@mui/icons-material/Person'
import logo from '../assets/logo.png'
import { getMe } from '../api/authApi'

export default function DashboardHeader() {
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getMe()
        if (userData.full_name) {
          // Extract first name and last initial
          const nameParts = userData.full_name.trim().split(' ')
          if (nameParts.length > 1) {
            setUserName(`${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`)
          } else {
            setUserName(nameParts[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
        // Keep default "User" if fetch fails
      }
    }

    fetchUserData()
  }, [])

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: 'primary.main', color: 'neutral.50', borderRadius: 0, width: '100%' }}
    >
      <Toolbar sx={{ px: 4 }}>
        <Box
          component="img"
          src={logo}
          alt="Nova Edu logo"
          sx={{ width: 32, height: 32, borderRadius: 1 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<LanguageIcon />}
            sx={{
              borderColor: 'neutral.50',
              color: 'neutral.50',
              '&:hover': { borderColor: 'neutral.50', bgcolor: 'primary.300' },
            }}
          >
            English
          </Button>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'white' }}>
            <PersonIcon sx={{ color: 'white' }} />
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
              {userName}
            </Typography>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}

