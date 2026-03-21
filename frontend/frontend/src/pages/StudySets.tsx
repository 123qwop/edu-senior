import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  LinearProgress,
  InputAdornment,
  Paper,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import SearchIcon from '@mui/icons-material/Search'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DownloadIcon from '@mui/icons-material/Download'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Link as RouterLink } from 'react-router-dom'
import { getUserRole, isTeacher } from '../api/authApi'
import { getStudySets, deleteStudySet, getStudySet, getStudySetQuestions, type StudySetOut } from '../api/studySetsApi'
import CreateStudySetDialog from '../components/CreateStudySetDialog'
import EditStudySetDialog from '../components/EditStudySetDialog'
import StudySetContentEditor from '../components/StudySetContentEditor'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { downloadStudySet, removeDownloadedStudySet, isStudySetDownloaded, getAllDownloadedStudySets, initDB } from '../utils/offlineStorage'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncOfflineAttempts } from '../utils/syncOfflineAttempts'

// Helper function to format last activity (display only; API values unchanged)
function formatLastActivity(dateString: string | null, t: TFunction): string {
  if (!dateString) return t('studySets.activityNever')
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('studySets.activityToday')
  if (diffDays === 1) return t('studySets.activity1d')
  if (diffDays < 7) return t('studySets.activityNd', { days: diffDays })
  if (diffDays < 30) return t('studySets.activityNw', { weeks: Math.floor(diffDays / 7) })
  return t('studySets.activityNmo', { months: Math.floor(diffDays / 30) })
}

interface StudySetCardProps {
  studySet: StudySetOut & { lastActivity?: string; isRecommended?: boolean; owner?: string; isDownloaded?: boolean }
  isTeacherView: boolean
  onDownload?: (setId: number) => void
  onRemoveDownload?: (setId: number) => void
  isDownloading?: boolean
  isOnline?: boolean
  onEdit?: (studySet: StudySetOut) => void
  onEditContent?: (studySet: StudySetOut) => void
  onDelete?: (setId: number) => void
  onAssign?: (studySet: StudySetOut) => void
  onView?: (studySet: StudySetOut) => void
  userId?: number | null
}

function StudySetCard({ studySet, isTeacherView, onDownload, onRemoveDownload, isDownloading, isOnline, onEdit, onEditContent, userId, onDelete, onAssign, onView }: StudySetCardProps) {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Quiz':
        return 'primary'
      case 'Flashcards':
        return 'success'
      case 'Problem set':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'neutral.300',
        borderRadius: 3,
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        {/* Title */}
        <Typography
          variant="h6"
          component={RouterLink}
          to={`/dashboard/study-sets/${studySet.id}/practice`}
          sx={{
            fontWeight: 600,
            color: 'neutral.700',
            mb: 1.5,
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
            display: 'block',
          }}
        >
          {studySet.title}
        </Typography>

        {/* Subject and Type Badge */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Chip
            label={studySet.subject}
            size="small"
            sx={{ bgcolor: 'neutral.100', color: 'neutral.700', fontSize: '0.75rem' }}
          />
          <Chip
            label={studySet.type}
            size="small"
            color={getTypeColor(studySet.type) as 'primary' | 'success' | 'warning' | 'default'}
            sx={{ fontSize: '0.75rem' }}
          />
        </Stack>

        {/* Meta Info */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            {studySet.item_count}{' '}
            {studySet.type === 'Flashcards' ? t('common.cards') : t('common.questions')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            {t('studySets.lastActivity', {
              value: studySet.lastActivity || t('studySets.activityNever'),
            })}
          </Typography>
        </Stack>

        {/* Progress (for students) */}
        {!isTeacherView && studySet.mastery !== null && studySet.mastery > 0 && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                {t('studySets.mastery')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'neutral.700' }}>
                {studySet.mastery}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={studySet.mastery || 0}
              sx={{ height: 6, borderRadius: 3, bgcolor: 'neutral.100' }}
            />
          </Box>
        )}

        {/* Badges */}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          {studySet.isRecommended && (
            <Chip
              label={t('studySets.recommended')}
              size="small"
              sx={{ bgcolor: 'primary.50', color: 'primary.main', fontSize: '0.75rem' }}
            />
          )}
          {studySet.isDownloaded && (
            <Chip
              label={t('studySets.downloaded')}
              size="small"
              sx={{ bgcolor: 'success.50', color: 'success.main', fontSize: '0.75rem' }}
            />
          )}
          {studySet.is_assigned && (
            <Chip
              label={t('studySets.assigned')}
              size="small"
              sx={{ bgcolor: 'warning.50', color: 'warning.main', fontSize: '0.75rem' }}
            />
          )}
        </Stack>
      </CardContent>

      {/* Actions */}
      <Box
        sx={{
          p: 2,
          pt: 0,
          borderTop: '1px solid',
          borderColor: 'neutral.200',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1}>
          {isTeacherView ? (
            <>
              <Button
                variant="contained"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => onEdit?.(studySet)}
                sx={{ bgcolor: 'primary.main' }}
              >
                {t('studySets.editDetails')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onEditContent?.(studySet)}
                sx={{ borderColor: 'primary.main', color: 'primary.main' }}
              >
                {t('studySets.editContent')}
              </Button>
              <IconButton
                size="small"
                sx={{ color: 'neutral.500' }}
                onClick={() => {
                  onAssign?.(studySet)
                  handleClose()
                }}
                title={t('studySets.assignToClass')}
              >
                <AssignmentIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{ color: 'neutral.500' }}
                onClick={() => {
                  onView?.(studySet)
                  handleClose()
                }}
                title={t('studySets.viewAnalytics')}
              >
                <AnalyticsIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayArrowIcon />}
                component={RouterLink}
                to={`/dashboard/study-sets/${studySet.id}/practice`}
                sx={{ bgcolor: 'primary.main' }}
              >
                {studySet.mastery !== null && studySet.mastery > 0 ? t('common.continue') : t('common.study')}
              </Button>
              {userId !== null && studySet.creator_id === userId && (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => onEdit?.(studySet)}
                    sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                  >
                    {t('studySets.editDetails')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onEditContent?.(studySet)}
                    sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                  >
                    {t('studySets.editContent')}
                  </Button>
                </>
              )}
            </>
          )}
        </Stack>

        <Stack direction="row" spacing={0.5}>
          {!isTeacherView && (
            <IconButton
              size="small"
              onClick={() => {
                if (studySet.isDownloaded) {
                  onRemoveDownload?.(studySet.id)
                } else {
                  onDownload?.(studySet.id)
                }
              }}
              disabled={!isOnline && !studySet.isDownloaded}
              title={studySet.isDownloaded ? t('studySets.removeDownload') : t('studySets.downloadOffline')}
              sx={{ 
                color: studySet.isDownloaded ? 'success.main' : 'neutral.500',
                '&:disabled': { opacity: 0.5 }
              }}
            >
              {isDownloading ? (
                <CircularProgress size={20} />
              ) : studySet.isDownloaded ? (
                <DownloadIcon fontSize="small" />
              ) : (
                <CloudDownloadIcon fontSize="small" />
              )}
            </IconButton>
          )}
          <IconButton
            size="small"
            sx={{ color: 'neutral.500' }}
            onClick={() => onView?.(studySet)}
            title={t('studySets.viewDetails')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleClick} sx={{ color: 'neutral.500' }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* More Menu */}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {(isTeacherView || (userId !== null && studySet.creator_id === userId)) && (
          <MenuItem 
            onClick={() => {
              onEdit?.(studySet)
              handleClose()
            }}
          >
            {t('studySets.editDetails')}
          </MenuItem>
        )}
        {(isTeacherView || (userId !== null && studySet.creator_id === userId)) && (
          <MenuItem 
            onClick={() => {
              onEditContent?.(studySet)
              handleClose()
            }}
          >
            {t('studySets.editContent')}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleClose()
            onView?.(studySet)
          }}
        >
          {t('studySets.viewDetails')}
        </MenuItem>
        {isTeacherView && (
          <MenuItem
            onClick={() => {
              onAssign?.(studySet)
              handleClose()
            }}
          >
            {t('studySets.assignToClass')}
          </MenuItem>
        )}
        {isTeacherView && (
          <MenuItem
            onClick={() => {
              onView?.(studySet)
              handleClose()
            }}
          >
            {t('studySets.viewAnalytics')}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (window.confirm(t('studySets.deleteConfirm'))) {
              onDelete?.(studySet.id)
            }
            handleClose()
          }}
          sx={{ color: 'error.main' }}
        >
          {t('common.delete')}
        </MenuItem>
      </Menu>
    </Card>
  )
}

export default function StudySets() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [studySets, setStudySets] = useState<(StudySetOut & { lastActivity?: string; isRecommended?: boolean; owner?: string; isDownloaded?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedOwnership, setSelectedOwnership] = useState('')
  const [sortBy, setSortBy] = useState('recently-used')
  const [currentTab, setCurrentTab] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [downloadingSetId, setDownloadingSetId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedStudySet, setSelectedStudySet] = useState<StudySetOut | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedStudySetForAssign, setSelectedStudySetForAssign] = useState<StudySetOut | null>(null)
  const [contentEditorOpen, setContentEditorOpen] = useState(false)
  const [selectedStudySetForContent, setSelectedStudySetForContent] = useState<StudySetOut | null>(null)

  // Function to fetch study sets (extracted for reuse)
  const fetchStudySets = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (selectedSubject) params.subject = selectedSubject
      if (selectedType) params.type = selectedType
      if (selectedOwnership) params.ownership = selectedOwnership
      if (sortBy) params.sort = sortBy

      const data = await getStudySets(params)
      console.log('Fetched study sets:', data) // Debug log
      
      // Check which sets are downloaded
      const downloadedSetIds = new Set<number>()
      if (!isTeacherView) {
        for (const set of data) {
          const isDownloaded = await isStudySetDownloaded(set.id)
          if (isDownloaded) {
            downloadedSetIds.add(set.id)
          }
        }
      }
      
      const enrichedData = data.map((set) => ({
        ...set,
        lastActivity: set.updated_at ? formatLastActivity(set.updated_at, t) : t('studySets.activityNever'),
        isRecommended: false,
        owner: userId !== null && set.creator_id === userId ? (userRole === 'teacher' ? 'teacher' : 'student') : 'other',
        isDownloaded: downloadedSetIds.has(set.id),
        is_downloaded: downloadedSetIds.has(set.id),
      }))
      console.log('Enriched study sets with download status:', enrichedData.filter(s => s.isDownloaded).length, 'downloaded')
      setStudySets(enrichedData)
    } catch (err) {
      console.error('Failed to fetch study sets:', err)
      setError(err instanceof Error ? err.message : t('studySets.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initDB()
    setUserRole(getUserRole())
    // Get user ID from API
    const fetchUserInfo = async () => {
      try {
        const { getMe } = await import('../api/authApi')
        const userData = await getMe()
        if (userData.id) {
          setUserId(userData.id)
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err)
      }
    }
    fetchUserInfo()

    // Sync offline attempts when coming online
    if (isOnline) {
      syncOfflineAttempts().then(({ synced }) => {
        if (synced > 0) {
          console.log(`Synced ${synced} offline attempts`)
        }
      })
    }
  }, [isOnline])

  // Fetch study sets - also refetch when userId changes
  useEffect(() => {
    if (userId !== null || userRole !== null) {
      if (isOnline) {
        fetchStudySets()
      } else {
        // When offline, show only downloaded sets
        loadDownloadedSets()
      }
    }
  }, [searchQuery, selectedSubject, selectedType, selectedOwnership, sortBy, userRole, userId, isOnline, currentTab])
  
  // When switching to Offline tab, reload downloaded sets (works both online and offline)
  useEffect(() => {
    if (currentTab === 3 && !isTeacherView) {
      loadDownloadedSets()
    }
  }, [currentTab])

  const loadDownloadedSets = async () => {
    try {
      setLoading(true)
      setError(null)
      const downloaded = await getAllDownloadedStudySets()
      console.log('Loaded downloaded sets from IndexedDB:', downloaded.length, downloaded.map(s => ({ id: s.set_id, title: s.title })))
      const enrichedData = downloaded.map((set) => ({
        id: set.set_id,
        title: set.title,
        subject: set.subject || null,
        type: set.type,
        level: set.level || null,
        description: set.description || null,
        creator_id: 0,
        created_at: new Date(set.downloaded_at).toISOString(),
        updated_at: new Date(set.downloaded_at).toISOString(),
        item_count: set.questions ? set.questions.length : 0,
        tags: [],
        is_assigned: false,
        is_downloaded: true,
        mastery: null,
        lastActivity: t('studySets.downloaded'),
        isRecommended: false,
        owner: 'other',
        isDownloaded: true,
      }))
      console.log('Enriched downloaded sets:', enrichedData.length, enrichedData.map(s => ({ id: s.id, title: s.title, isDownloaded: s.isDownloaded })))
      setStudySets(enrichedData)
    } catch (err) {
      console.error('Failed to load downloaded sets:', err)
      setError(t('studySets.loadDownloadedFailed'))
    } finally {
      setLoading(false)
    }
  }

  const isTeacherView = isTeacher()

  // Student tabs: All, Assigned, My sets, Offline — Teacher: My sets, Shared with me, All
  const tabs = useMemo(
    () =>
      isTeacherView
        ? [t('studySets.tabMySets'), t('studySets.tabSharedWithMe'), t('studySets.tabAll')]
        : [
            t('studySets.tabAll'),
            t('studySets.tabAssigned'),
            t('studySets.tabMySets'),
            t('studySets.tabOffline'),
          ],
    [t, isTeacherView],
  )

  // Filter study sets based on current tab (client-side filtering for tabs)
  const filteredSets = studySets.filter((set) => {
    // Tab filtering
    if (isTeacherView) {
      if (currentTab === 0) {
        // My sets - only show sets created by current user
        if (userId === null) return true // Show all if userId not loaded yet
        return set.creator_id === userId
      }
      if (currentTab === 1) {
        // Shared with me - exclude own sets
        if (userId === null) return true // Show all if userId not loaded yet
        return set.creator_id !== userId
      }
      // Tab 2 (All) shows everything
      return true
    } else {
      if (currentTab === 0) return true // All - show everything
      if (currentTab === 1 && !set.is_assigned) return false // Assigned
      if (currentTab === 2) {
        // My sets - only show sets created by current user
        if (userId === null) return true // Show all if userId not loaded yet
        return set.creator_id === userId
      }
      if (currentTab === 3) {
        // Offline tab - only show downloaded sets
        // Check both isDownloaded flag and verify in IndexedDB
        if (!set.isDownloaded && !set.is_downloaded) {
          return false
        }
        return true
      }
    }

    return true
  })

  const handleDownloadForOffline = async (setId: number) => {
    if (!isOnline) {
      alert(t('studySets.mustOnlineDownload'))
      return
    }

    try {
      setDownloadingSetId(setId)
      const [studySet, questions] = await Promise.all([
        getStudySet(setId),
        getStudySetQuestions(setId),
      ])
      
      console.log('Downloading study set:', studySet.id, 'with', questions.length, 'questions')
      await downloadStudySet(studySet, questions)
      console.log('Successfully downloaded study set to IndexedDB')
      
      // Verify it was saved
      const isDownloaded = await isStudySetDownloaded(setId)
      console.log('Verification - isDownloaded:', isDownloaded)
      
      // Always update the current list
      setStudySets(prev => prev.map(set => 
        set.id === setId ? { ...set, isDownloaded: true, is_downloaded: true } : set
      ))
      
      // If we're on the Offline tab, reload all downloaded sets to show the new one
      if (currentTab === 3) {
        console.log('On Offline tab, reloading all downloaded sets...')
        await loadDownloadedSets()
      }
      
      alert(t('studySets.downloadSuccess'))
    } catch (err) {
      console.error('Failed to download study set:', err)
      alert(err instanceof Error ? err.message : t('studySets.downloadFailed'))
    } finally {
      setDownloadingSetId(null)
    }
  }

  const handleRemoveDownload = async (setId: number) => {
    try {
      await removeDownloadedStudySet(setId)
      setStudySets(prev => prev.map(set => 
        set.id === setId ? { ...set, isDownloaded: false } : set
      ))
    } catch (err) {
      console.error('Failed to remove downloaded study set:', err)
      alert(err instanceof Error ? err.message : t('studySets.removeDownloadFailed'))
    }
  }

  const handleDelete = async (setId: number) => {
    try {
      await deleteStudySet(setId)
      fetchStudySets()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('studySets.deleteFailed'))
    }
  }

  const handleAssign = (studySet: StudySetOut) => {
    setSelectedStudySetForAssign(studySet)
    setAssignDialogOpen(true)
  }

  const handleView = (studySet: StudySetOut) => {
    if (isTeacherView) {
      navigate(`/dashboard/analytics?setId=${studySet.id}`)
    } else {
      navigate(`/dashboard/study-sets/${studySet.id}/practice`)
    }
  }

  const handleEditContent = (studySet: StudySetOut) => {
    setSelectedStudySetForContent(studySet)
    setContentEditorOpen(true)
  }

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      {/* Header */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        {isTeacherView ? t('studySets.titleTeacher') : t('studySets.title')}
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'neutral.200', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab} sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
        </Tabs>
      </Box>

      {/* Offline Status Indicator */}
      {!isOnline && (
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
              {t('studySets.offlineMode')}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Toolbar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'neutral.50', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder={t('studySets.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'neutral.500' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Filters */}
          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('studySets.subject')}</InputLabel>
              <Select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                label={t('studySets.subject')}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="Mathematics">{t('studySets.subjectMathematics')}</MenuItem>
                <MenuItem value="Physics">{t('studySets.subjectPhysics')}</MenuItem>
                <MenuItem value="Chemistry">{t('studySets.subjectChemistry')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('studySets.type')}</InputLabel>
              <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} label={t('studySets.type')}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="Flashcards">{t('studySets.typeFlashcards')}</MenuItem>
                <MenuItem value="Quiz">{t('studySets.typeQuiz')}</MenuItem>
                <MenuItem value="Problem set">{t('studySets.typeProblemSet')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('studySets.ownership')}</InputLabel>
              <Select
                value={selectedOwnership}
                onChange={(e) => setSelectedOwnership(e.target.value)}
                label={t('studySets.ownership')}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="Mine">{t('studySets.mine')}</MenuItem>
                {isTeacherView ? (
                  <MenuItem value="Shared with me">{t('studySets.sharedWithMe')}</MenuItem>
                ) : (
                  <MenuItem value="Assigned">{t('studySets.assignedFilter')}</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('studySets.sort')}</InputLabel>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label={t('studySets.sort')}>
                <MenuItem value="recently-used">{t('studySets.sortRecentlyUsed')}</MenuItem>
                <MenuItem value="recently-created">{t('studySets.sortRecentlyCreated')}</MenuItem>
                <MenuItem value="a-z">{t('studySets.sortAZ')}</MenuItem>
                <MenuItem value="recommended">{t('studySets.sortRecommended')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Create Button - Hide in "Shared with me" tab for teachers and "Assigned" tab for students */}
          {!(currentTab === 1) && (
            <Grid size={{ xs: 12, md: 'auto' }}>
              <Button
                variant="contained"
                onClick={() => setCreateDialogOpen(true)}
                sx={{ bgcolor: 'primary.main', whiteSpace: 'nowrap' }}
              >
                {isTeacherView ? t('studySets.createStudySet') : t('studySets.createPersonalSet')}
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Study Sets Grid */}
      {loading ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'neutral.50' }}>
          <Typography variant="body1" sx={{ color: 'neutral.500' }}>
            {t('studySets.loadingSets')}
          </Typography>
        </Paper>
      ) : error ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'neutral.50' }}>
          <Typography variant="body1" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        </Paper>
      ) : filteredSets.length > 0 ? (
        <Grid container spacing={3}>
          {filteredSets.map((studySet) => (
            <Grid key={studySet.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <StudySetCard 
                studySet={studySet} 
                isTeacherView={isTeacherView} 
                onDownload={handleDownloadForOffline}
                onRemoveDownload={handleRemoveDownload}
                isDownloading={downloadingSetId === studySet.id}
                isOnline={isOnline}
                onEdit={(set) => {
                  setSelectedStudySet(set)
                  setEditDialogOpen(true)
                }}
                onEditContent={handleEditContent}
                onDelete={handleDelete}
                onAssign={handleAssign}
                onView={handleView}
                userId={userId}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'neutral.50' }}>
          <Typography variant="body1" sx={{ color: 'neutral.500' }}>
            {isTeacherView ? t('studySets.emptyTeacher') : t('studySets.emptyStudent')}
          </Typography>
        </Paper>
      )}

      {/* Create Study Set Dialog */}
      <CreateStudySetDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchStudySets}
      />

      {/* Edit Study Set Dialog */}
      <EditStudySetDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setSelectedStudySet(null)
        }}
        onSuccess={() => {
          fetchStudySets()
          setEditDialogOpen(false)
          setSelectedStudySet(null)
        }}
        studySet={selectedStudySet}
      />

      {/* Assign Study Set Dialog - Navigate to classes for now */}
      {assignDialogOpen && (
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
          <DialogTitle>
            {t('studySets.assignDialogTitle')}
            {selectedStudySetForAssign ? ` — ${selectedStudySetForAssign.title}` : ''}
          </DialogTitle>
          <DialogContent>
            <Typography>{t('studySets.assignDialogBody')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="contained"
              onClick={() => {
                setAssignDialogOpen(false)
                navigate('/dashboard/subjects')
              }}
            >
              {t('studySets.goToClasses')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Content Editor Dialog */}
      <StudySetContentEditor
        open={contentEditorOpen}
        onClose={() => {
          setContentEditorOpen(false)
          setSelectedStudySetForContent(null)
        }}
        studySet={selectedStudySetForContent}
      />
    </Box>
  )
}
