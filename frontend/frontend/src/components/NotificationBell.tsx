import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Typography,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import {
  getNotifications,
  getNotificationsWsTicket,
  markAllNotificationsRead,
  markNotificationRead,
  wsUrlForApi,
  type NotificationItem,
} from '../api/notificationsApi'
import { getUserRole } from '../api/authApi'

export default function NotificationBell() {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const open = Boolean(anchor)

  const refresh = useCallback(async () => {
    try {
      const data = await getNotifications(40)
      setItems(data.items)
      setUnread(data.unread_count)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (getUserRole() !== 'student') {
      return
    }
    refresh()
  }, [refresh])

  useEffect(() => {
    if (getUserRole() !== 'student') {
      return
    }
    let cancelled = false

    const connect = async () => {
      try {
        const { ticket } = await getNotificationsWsTicket()
        if (cancelled) return
        const url = wsUrlForApi(`/notifications/ws?ticket=${encodeURIComponent(ticket)}`)
        const ws = new WebSocket(url)
        wsRef.current = ws
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data as string)
            if (data?.type === 'notification' && data?.notification) {
              setItems((prev) => [data.notification, ...prev])
              setUnread((u) => u + 1)
            }
          } catch {
            /* ignore */
          }
        }
        ws.onerror = () => {
          ws.close()
        }
      } catch {
        /* ticket failed — in-app list still works */
      }
    }

    connect()
    const id = window.setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect()
      }
    }, 60000)

    return () => {
      cancelled = true
      window.clearInterval(id)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  const handleOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget)
    setLoading(true)
    await refresh()
    setLoading(false)
  }

  const handleClose = () => setAnchor(null)

  const onPick = async (n: NotificationItem) => {
    if (!n.read_at) {
      try {
        await markNotificationRead(n.id)
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
        setUnread((u) => Math.max(0, u - 1))
      } catch {
        /* ignore */
      }
    }
  }

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
      setUnread(0)
    } catch {
      /* ignore */
    }
  }

  if (getUserRole() !== 'student') {
    return null
  }

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} aria-label={t('notifications.title')}>
        <Badge badgeContent={unread} color="error" max={99} invisible={unread === 0}>
          <NotificationsIcon sx={{ color: 'white' }} />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxWidth: '100%' } }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('notifications.title')}
          </Typography>
          {unread > 0 ? (
            <Button size="small" onClick={onMarkAll}>
              {t('notifications.markAllRead')}
            </Button>
          ) : null}
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Typography variant="body2" sx={{ px: 2, py: 2, color: 'neutral.600' }}>
            {t('notifications.empty')}
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
            {items.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => onPick(n)}
                sx={{ alignItems: 'flex-start', bgcolor: n.read_at ? 'transparent' : 'action.hover' }}
              >
                <ListItemText
                  primary={n.title}
                  secondary={
                    <Typography component="span" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {n.body}
                    </Typography>
                  }
                  primaryTypographyProps={{ fontWeight: n.read_at ? 400 : 700 }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  )
}
