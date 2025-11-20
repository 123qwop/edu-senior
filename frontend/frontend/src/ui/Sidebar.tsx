import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Box, Divider, List, ListItemButton, ListItemText, Paper } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import HomeIcon from '@mui/icons-material/Home'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import DownloadIcon from '@mui/icons-material/Download'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import BarChartIcon from '@mui/icons-material/BarChart'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SettingsIcon from '@mui/icons-material/Settings'
import ClassIcon from '@mui/icons-material/Class'
import PeopleIcon from '@mui/icons-material/People'
import { getUserRole } from '../api/authApi'

// Student navigation items
const studentNavigationItems = [
  { label: 'Home', path: '/dashboard', icon: HomeIcon },
  { label: 'Study sets', path: '/dashboard/study-sets', icon: MenuBookIcon },
  { label: 'My classes', path: '/dashboard/subjects', icon: ClassIcon },
  { label: 'Offline Downloads', path: '/dashboard/downloads', icon: DownloadIcon },
  { label: 'Progress and analytics', path: '/dashboard/analytics', icon: AnalyticsIcon },
  { label: 'Statistics', path: '/statistics', icon: BarChartIcon },
  { label: 'AI Recommendations', path: '/dashboard/ai-recommendations', icon: LightbulbIcon },
  { label: 'Gamification', path: '/dashboard/gamification', icon: EmojiEventsIcon },
  { label: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
]

// Teacher navigation items
const teacherNavigationItems = [
  { label: 'Home', path: '/dashboard', icon: HomeIcon },
  { label: 'My Classes', path: '/dashboard/subjects', icon: ClassIcon },
  { label: 'Study Materials', path: '/dashboard/study-sets', icon: MenuBookIcon },
  { label: 'Student Progress', path: '/dashboard/analytics', icon: AnalyticsIcon },
  { label: 'Statistics', path: '/statistics', icon: BarChartIcon },
  { label: 'AI Recommendations', path: '/dashboard/ai-recommendations', icon: LightbulbIcon },
  { label: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
]

export default function Sidebar() {
  const location = useLocation()
  const userRole = getUserRole()
  const navigationItems = userRole === 'teacher' ? teacherNavigationItems : studentNavigationItems

  return (
    <Paper
      elevation={0}
      sx={{
        width: 280,
        height: '100%',
        bgcolor: 'neutral.50',
        borderRadius: 0,
        borderRight: '1px solid',
        borderColor: 'neutral.300',
        overflow: 'auto',
      }}
    >
      <Box sx={{ pt: 3, pb: 2 }}>
        <List component="nav" sx={{ px: 2 }}>
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')

            return (
              <ListItemButton
                key={item.path}
                component={RouterLink}
                to={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.100',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'neutral.100',
                  },
                }}
              >
                <Icon sx={{ mr: 2, fontSize: 20 }} />
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9375rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            )
          })}
        </List>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ px: 2, pb: 2 }}>
          <ListItemButton
            component={RouterLink}
            to="/login"
            sx={{
              borderRadius: 2,
              color: 'neutral.700',
              '&:hover': {
                bgcolor: 'neutral.100',
              },
            }}
          >
            <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
            <ListItemText
              primary="Sign out"
              primaryTypographyProps={{
                fontSize: '0.9375rem',
                fontWeight: 400,
              }}
            />
          </ListItemButton>
        </Box>
      </Box>
    </Paper>
  )
}

