import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Divider, List, ListItemButton, ListItemText, Paper } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import HomeIcon from '@mui/icons-material/Home'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import DownloadIcon from '@mui/icons-material/Download'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SettingsIcon from '@mui/icons-material/Settings'
import ClassIcon from '@mui/icons-material/Class'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { getUserRole, API_URL } from '../api/authApi'

const adminNavigationItems = [
  { labelKey: 'nav.home', path: '/dashboard', icon: HomeIcon },
  { labelKey: 'nav.admin', path: '/dashboard/admin', icon: AdminPanelSettingsIcon },
  { labelKey: 'nav.settings', path: '/dashboard/settings', icon: SettingsIcon },
] as const

// Student navigation items (keys map to src/locales/*.json under "nav")
const studentNavigationItems = [
  { labelKey: 'nav.home', path: '/dashboard', icon: HomeIcon },
  { labelKey: 'nav.studySets', path: '/dashboard/study-sets', icon: MenuBookIcon },
  { labelKey: 'nav.myClasses', path: '/dashboard/subjects', icon: ClassIcon },
  { labelKey: 'nav.offlineDownloads', path: '/dashboard/downloads', icon: DownloadIcon },
  { labelKey: 'nav.progress', path: '/dashboard/progress', icon: AnalyticsIcon },
  { labelKey: 'nav.aiRecommendations', path: '/dashboard/ai-recommendations', icon: LightbulbIcon },
  { labelKey: 'nav.gamification', path: '/dashboard/gamification', icon: EmojiEventsIcon },
  { labelKey: 'nav.settings', path: '/dashboard/settings', icon: SettingsIcon },
] as const

const teacherNavigationItems = [
  { labelKey: 'nav.home', path: '/dashboard', icon: HomeIcon },
  { labelKey: 'nav.myClassesTeacher', path: '/dashboard/subjects', icon: ClassIcon },
  { labelKey: 'nav.studyMaterials', path: '/dashboard/study-sets', icon: MenuBookIcon },
  { labelKey: 'nav.studentProgress', path: '/dashboard/analytics', icon: AnalyticsIcon },
  { labelKey: 'nav.aiRecommendations', path: '/dashboard/ai-recommendations', icon: LightbulbIcon },
  { labelKey: 'nav.settings', path: '/dashboard/settings', icon: SettingsIcon },
] as const

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const userRole = getUserRole()
  const navigationItems =
    userRole === 'admin'
      ? adminNavigationItems
      : userRole === 'teacher'
        ? teacherNavigationItems
        : studentNavigationItems

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
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname === item.path || location.pathname.startsWith(item.path + '/')

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
                  primary={t(item.labelKey)}
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
            component="a"
            href={`${API_URL}/auth/logout`}
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
              primary={t('nav.signOut')}
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

