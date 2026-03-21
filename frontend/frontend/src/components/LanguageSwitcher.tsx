import { useTranslation } from 'react-i18next';
import { Box, Button, ButtonGroup, Typography } from '@mui/material';

function normalizeLng(lng: string): 'en' | 'ru' | 'kz' {
  const code = lng.split('-')[0]?.toLowerCase() ?? 'en';
  if (code === 'ru' || code === 'kz') return code;
  return 'en';
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = normalizeLng(i18n.language);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: (theme) => theme.zIndex.modal + 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        bgcolor: 'background.paper',
        borderRadius: 1,
        px: 1,
        py: 0.5,
        boxShadow: 1,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
        {t('common.languageLabel')}
      </Typography>
      <ButtonGroup
        variant="outlined"
        size="small"
        aria-label={t('common.languageLabel')}
      >
        <Button
          onClick={() => void i18n.changeLanguage('en')}
          variant={current === 'en' ? 'contained' : 'outlined'}
          color="primary"
          aria-pressed={current === 'en'}
        >
          EN
        </Button>
        <Button
          onClick={() => void i18n.changeLanguage('ru')}
          variant={current === 'ru' ? 'contained' : 'outlined'}
          color="primary"
          aria-pressed={current === 'ru'}
        >
          RU
        </Button>
        <Button
          onClick={() => void i18n.changeLanguage('kz')}
          variant={current === 'kz' ? 'contained' : 'outlined'}
          color="primary"
          aria-pressed={current === 'kz'}
        >
          KZ
        </Button>
      </ButtonGroup>
    </Box>
  );
}

export default LanguageSwitcher;
