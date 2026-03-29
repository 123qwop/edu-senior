import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  getAdminUsers,
  getAdminStudySets,
  patchAdminUserRole,
  deleteAdminUser,
  deleteAdminStudySet,
  type AdminUser,
  type AdminStudySet,
} from '../api/adminApi';
import { getMe } from '../api/authApi';

const ROLES = ['student', 'teacher', 'admin'] as const;

export default function AdminPortal() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [studySets, setStudySets] = useState<AdminStudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [confirmUserId, setConfirmUserId] = useState<number | null>(null);
  const [confirmSetId, setConfirmSetId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [u, s, me] = await Promise.all([getAdminUsers(), getAdminStudySets(), getMe()]);
      setUsers(u);
      setStudySets(s);
      setCurrentUserId(me.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      const updated = await patchAdminUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (e) {
      alert(e instanceof Error ? e.message : t('admin.loadFailed'));
    }
  };

  const handleDeleteUser = async () => {
    if (confirmUserId == null) return;
    try {
      await deleteAdminUser(confirmUserId);
      setUsers((prev) => prev.filter((u) => u.id !== confirmUserId));
      setConfirmUserId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : t('admin.loadFailed'));
    }
  };

  const handleDeleteSet = async () => {
    if (confirmSetId == null) return;
    try {
      await deleteAdminStudySet(confirmSetId);
      setStudySets((prev) => prev.filter((s) => s.id !== confirmSetId));
      setConfirmSetId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : t('admin.loadFailed'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, px: 2, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: 'neutral.700' }}>
        {t('admin.portalTitle')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={4}>
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'neutral.200' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {t('admin.users')}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.colEmail')}</TableCell>
                  <TableCell>{t('admin.colName')}</TableCell>
                  <TableCell>{t('admin.colRole')}</TableCell>
                  <TableCell align="right">{t('admin.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel id={`role-${u.id}`}>{t('admin.colRole')}</InputLabel>
                        <Select
                          labelId={`role-${u.id}`}
                          label={t('admin.colRole')}
                          value={(u.role ?? 'student').toLowerCase()}
                          disabled={u.id === currentUserId}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          {ROLES.map((r) => (
                            <MenuItem key={r} value={r}>
                              {r}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        color="error"
                        size="small"
                        disabled={u.id === currentUserId}
                        onClick={() => setConfirmUserId(u.id)}
                      >
                        {t('admin.delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'neutral.200' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {t('admin.studySets')}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.colTitle')}</TableCell>
                  <TableCell>{t('admin.colSubject')}</TableCell>
                  <TableCell>{t('admin.colType')}</TableCell>
                  <TableCell>{t('admin.colCreator')}</TableCell>
                  <TableCell align="right">{t('admin.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studySets.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.title}</TableCell>
                    <TableCell>{s.subject ?? '—'}</TableCell>
                    <TableCell>{s.type}</TableCell>
                    <TableCell>
                      {s.creator_name} ({s.creator_email})
                    </TableCell>
                    <TableCell align="right">
                      <Button color="error" size="small" onClick={() => setConfirmSetId(s.id)}>
                        {t('admin.delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      <Dialog open={confirmUserId !== null} onClose={() => setConfirmUserId(null)}>
        <DialogTitle>{t('admin.deleteUserTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('admin.deleteUserBody')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUserId(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDeleteUser}>
            {t('admin.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmSetId !== null} onClose={() => setConfirmSetId(null)}>
        <DialogTitle>{t('admin.deleteSetTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('admin.deleteSetBody')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSetId(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDeleteSet}>
            {t('admin.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
