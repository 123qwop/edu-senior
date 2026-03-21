import { useState, useEffect } from 'react'
import { AppBar, Box, Stack, Toolbar, Typography } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import { useTranslation } from 'react-i18next'
import logo from '../assets/logo.png'
import { getMe } from '../api/authApi'

export default function DashboardHeader() {
  const { t, i18n } = useTranslation()
  const [userName, setUserName] = useState(() => i18n.t('dashboard.defaultUserName'))

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getMe()
        if (userData.full_name) {
          const nameParts = userData.full_name.trim().split(/\s+/)
          if (nameParts.length > 1) {
            setUserName(`${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`)
          } else {
            setUserName(nameParts[0])
          }
        } else {
          setUserName(i18n.t('dashboard.defaultUserName'))
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      }
    }

    fetchUserData()
  }, [i18n])

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
          alt={t('header.logoAlt')}
          sx={{ width: 32, height: 32, borderRadius: 1 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={2} alignItems="center">
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
