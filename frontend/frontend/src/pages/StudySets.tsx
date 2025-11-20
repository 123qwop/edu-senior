import { useState, useEffect } from 'react'
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
import { getStudySets, markStudySetOffline, removeStudySetOffline, type StudySetOut } from '../api/studySetsApi'
import CreateStudySetDialog from '../components/CreateStudySetDialog'
import EditStudySetDialog from '../components/EditStudySetDialog'

// Helper function to format last activity
function formatLastActivity(dateString: string | null): string {
  if (!dateString) return 'Never studied'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

interface StudySetCardProps {
  studySet: StudySetOut & { lastActivity?: string; isRecommended?: boolean; owner?: string }
  isTeacherView: boolean
  onToggleOffline: (setId: number, isDownloaded: boolean) => void
  onEdit?: (studySet: StudySetOut) => void
  userId?: number | null
}

function StudySetCard({ studySet, isTeacherView, onToggleOffline, onEdit, userId }: StudySetCardProps) {
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
            {studySet.item_count} {studySet.type === 'Flashcards' ? 'cards' : 'questions'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            Last activity: {studySet.lastActivity || 'Never studied'}
          </Typography>
        </Stack>

        {/* Progress (for students) */}
        {!isTeacherView && studySet.mastery !== null && studySet.mastery > 0 && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                Mastery
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
              label="Recommended"
              size="small"
              sx={{ bgcolor: 'primary.50', color: 'primary.main', fontSize: '0.75rem' }}
            />
          )}
          {studySet.is_downloaded && (
            <Chip
              label="Downloaded"
              size="small"
              sx={{ bgcolor: 'success.50', color: 'success.main', fontSize: '0.75rem' }}
            />
          )}
          {studySet.is_assigned && (
            <Chip
              label="Assigned"
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
                Edit
              </Button>
              <IconButton size="small" sx={{ color: 'neutral.500' }}>
                <AssignmentIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ color: 'neutral.500' }}>
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
                {studySet.mastery !== null && studySet.mastery > 0 ? 'Continue' : 'Study'}
              </Button>
              {/* Only show Edit button for personal study sets (not assigned ones) */}
              {userId !== null && studySet.creator_id === userId && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => onEdit?.(studySet)}
                  sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                >
                  Edit
                </Button>
              )}
            </>
          )}
        </Stack>

        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            sx={{ color: 'neutral.500' }}
            onClick={() => {
              onToggleOffline(studySet.id, studySet.is_downloaded)
            }}
          >
            {studySet.is_downloaded ? <CloudDownloadIcon fontSize="small" /> : <DownloadIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" sx={{ color: 'neutral.500' }}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleClick} sx={{ color: 'neutral.500' }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* More Menu */}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {/* Only show Edit option for personal study sets (not assigned ones for students) */}
        {(isTeacherView || (userId !== null && studySet.creator_id === userId)) && (
          <MenuItem 
            onClick={() => {
              onEdit?.(studySet)
              handleClose()
            }}
          >
            Edit
          </MenuItem>
        )}
        <MenuItem onClick={handleClose}>Duplicate set</MenuItem>
        <MenuItem onClick={handleClose}>View version history</MenuItem>
        {isTeacherView && <MenuItem onClick={handleClose}>Share</MenuItem>}
        <MenuItem onClick={handleClose} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>
    </Card>
  )
}

export default function StudySets() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedOwnership, setSelectedOwnership] = useState('')
  const [sortBy, setSortBy] = useState('recently-used')
  const [currentTab, setCurrentTab] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedStudySet, setSelectedStudySet] = useState<StudySetOut | null>(null)
  const [studySets, setStudySets] = useState<StudySetOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const enrichedData = data.map((set) => ({
        ...set,
        lastActivity: set.updated_at ? formatLastActivity(set.updated_at) : 'Never studied',
        isRecommended: false,
        owner: userId !== null && set.creator_id === userId ? (userRole === 'teacher' ? 'teacher' : 'student') : 'other',
      }))
      setStudySets(enrichedData)
    } catch (err) {
      console.error('Failed to fetch study sets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load study sets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
  }, [])

  // Fetch study sets - also refetch when userId changes
  useEffect(() => {
    if (userId !== null || userRole !== null) {
      fetchStudySets()
    }
  }, [searchQuery, selectedSubject, selectedType, selectedOwnership, sortBy, userRole, userId])

  const isTeacherView = isTeacher()

  // Student tabs: All, Assigned, My sets, Offline
  // Teacher tabs: My sets, Shared with me, All
  const studentTabs = ['All', 'Assigned', 'My sets', 'Offline']
  const teacherTabs = ['My sets', 'Shared with me', 'All']
  const tabs = isTeacherView ? teacherTabs : studentTabs

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
      if (currentTab === 3 && !set.is_downloaded) return false // Offline
    }

    return true
  })

  const handleToggleOffline = async (setId: number, isDownloaded: boolean) => {
    try {
      if (isDownloaded) {
        await removeStudySetOffline(setId)
      } else {
        await markStudySetOffline(setId)
      }
      // Refresh study sets
      const data = await getStudySets({
        search: searchQuery || undefined,
        subject: selectedSubject || undefined,
        type: selectedType || undefined,
        ownership: selectedOwnership || undefined,
        sort: sortBy,
      })
      const enrichedData = data.map((set) => ({
        ...set,
        lastActivity: set.updated_at ? formatLastActivity(set.updated_at) : 'Never studied',
        isRecommended: false,
        owner: set.creator_id === userId ? (userRole === 'teacher' ? 'teacher' : 'student') : 'other',
      }))
      setStudySets(enrichedData)
    } catch (err) {
      console.error('Failed to toggle offline status:', err)
      alert(err instanceof Error ? err.message : 'Failed to update offline status')
    }
  }

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      {/* Header */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 3 }}>
        {isTeacherView ? 'Study Materials' : 'Study Sets'}
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'neutral.200', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          {tabs.map((tab) => (
            <Tab key={tab} label={tab} sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
        </Tabs>
      </Box>

      {/* Toolbar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'neutral.50', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search by title / subject / tags"
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
              <InputLabel>Subject</InputLabel>
              <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} label="Subject">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Mathematics">Mathematics</MenuItem>
                <MenuItem value="Physics">Physics</MenuItem>
                <MenuItem value="Chemistry">Chemistry</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} label="Type">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Flashcards">Flashcards</MenuItem>
                <MenuItem value="Quiz">Quiz</MenuItem>
                <MenuItem value="Problem set">Problem set</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Ownership</InputLabel>
              <Select
                value={selectedOwnership}
                onChange={(e) => setSelectedOwnership(e.target.value)}
                label="Ownership"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Mine">Mine</MenuItem>
                {isTeacherView ? (
                  <MenuItem value="Shared with me">Shared with me</MenuItem>
                ) : (
                  <MenuItem value="Assigned">Assigned</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort</InputLabel>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort">
                <MenuItem value="recently-used">Recently used</MenuItem>
                <MenuItem value="recently-created">Recently created</MenuItem>
                <MenuItem value="a-z">A-Z</MenuItem>
                <MenuItem value="recommended">Recommended first</MenuItem>
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
                {isTeacherView ? 'Create study set' : 'Create a personal study set'}
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Study Sets Grid */}
      {loading ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'neutral.50' }}>
          <Typography variant="body1" sx={{ color: 'neutral.500' }}>
            Loading study sets...
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
                onToggleOffline={handleToggleOffline}
                onEdit={(set) => {
                  setSelectedStudySet(set)
                  setEditDialogOpen(true)
                }}
                userId={userId}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'neutral.50' }}>
          <Typography variant="body1" sx={{ color: 'neutral.500' }}>
            No study sets found. {isTeacherView ? 'Create your first study set!' : 'Start by exploring assigned sets or create your own.'}
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
    </Box>
  )
}
