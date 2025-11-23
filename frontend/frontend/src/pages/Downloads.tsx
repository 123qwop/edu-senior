import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  LinearProgress,
  CircularProgress,
  Paper,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DeleteIcon from '@mui/icons-material/Delete'
import { useNavigate } from 'react-router-dom'
import { getAllDownloadedStudySets, removeDownloadedStudySet } from '../utils/offlineStorage'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function Downloads() {
  const [downloadedSets, setDownloadedSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

  useEffect(() => {
    loadDownloadedSets()
  }, [])

  const loadDownloadedSets = async () => {
    try {
      setLoading(true)
      setError(null)
      const downloaded = await getAllDownloadedStudySets()
      console.log('Loaded downloaded sets for Downloads page:', downloaded.length)
      const enrichedData = downloaded.map((set) => ({
        id: set.set_id,
        title: set.title,
        subject: set.subject || null,
        type: set.type,
        level: set.level || null,
        description: set.description || null,
        item_count: set.questions ? set.questions.length : 0,
        downloaded_at: set.downloaded_at,
      }))
      setDownloadedSets(enrichedData)
    } catch (err) {
      console.error('Failed to load downloaded sets:', err)
      setError('Failed to load downloaded study sets')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (setId: number) => {
    if (!window.confirm('Are you sure you want to remove this download? You will need to download it again to use it offline.')) {
      return
    }
    try {
      await removeDownloadedStudySet(setId)
      setDownloadedSets(prev => prev.filter(set => set.id !== setId))
    } catch (err) {
      console.error('Failed to remove downloaded study set:', err)
      alert(err instanceof Error ? err.message : 'Failed to remove downloaded study set')
    }
  }

  const handleStudy = (setId: number) => {
    navigate(`/dashboard/study-sets/${setId}/practice`)
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
        Offline Downloads
      </Typography>

      {!isOnline && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
            ⚠️ You are currently offline. Only downloaded study sets are available.
          </Typography>
        </Paper>
      )}

      {error && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        </Paper>
      )}

      {downloadedSets.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'neutral.50', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ color: 'neutral.600', mb: 1 }}>
            No offline downloads yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'neutral.500' }}>
            Download study sets from the Study Sets page to use them offline.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {downloadedSets.map((set) => (
            <Grid key={set.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'neutral.700', mb: 1 }}>
                        {set.title}
                      </Typography>
                      {set.description && (
                        <Typography variant="body2" sx={{ color: 'neutral.500', mb: 1 }}>
                          {set.description}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {set.subject && (
                        <Chip
                          label={set.subject}
                          size="small"
                          sx={{ bgcolor: 'primary.50', color: 'primary.main', fontSize: '0.75rem' }}
                        />
                      )}
                      {set.type && (
                        <Chip
                          label={set.type}
                          size="small"
                          sx={{ bgcolor: 'neutral.100', color: 'neutral.700', fontSize: '0.75rem' }}
                        />
                      )}
                      <Chip
                        label="Downloaded"
                        size="small"
                        sx={{ bgcolor: 'success.50', color: 'success.main', fontSize: '0.75rem' }}
                      />
                    </Stack>

                    <Typography variant="body2" sx={{ color: 'neutral.500' }}>
                      {set.item_count} {set.item_count === 1 ? 'item' : 'items'}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 2 }}>
                      <IconButton
                        onClick={() => handleStudy(set.id)}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                        title="Study"
                      >
                        <PlayArrowIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleRemove(set.id)}
                        sx={{
                          bgcolor: 'error.50',
                          color: 'error.main',
                          '&:hover': { bgcolor: 'error.100' },
                        }}
                        title="Remove download"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

