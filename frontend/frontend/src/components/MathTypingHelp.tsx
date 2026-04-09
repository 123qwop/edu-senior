/**
 * Expandable help for typing LaTeX math with KaTeX ($...$ / $$...$$).
 * Used in study set editors so authors see clear examples without leaving the page.
 */
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'

type MathTypingHelpProps = {
  /** If true, the panel starts open (good for the main content editor). */
  defaultExpanded?: boolean
}

export default function MathTypingHelp({ defaultExpanded = false }: MathTypingHelpProps) {
  const { t } = useTranslation()

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      elevation={0}
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" fontWeight={600}>
          {t('studySets.mathHelpTitle')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('studySets.mathHelpLead')}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            {t('studySets.mathHelpInlineTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('studySets.mathHelpInlineDesc')}
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              bgcolor: 'neutral.100',
              borderRadius: 1,
              fontSize: '0.8rem',
              overflowX: 'auto',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {t('studySets.mathHelpInlineExample')}
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            {t('studySets.mathHelpBlockTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('studySets.mathHelpBlockDesc')}
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              bgcolor: 'neutral.100',
              borderRadius: 1,
              fontSize: '0.8rem',
              overflowX: 'auto',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {t('studySets.mathHelpBlockExample')}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('studySets.mathHelpSymbols')}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {t('studySets.mathHelpFootnote')}
        </Typography>
      </AccordionDetails>
    </Accordion>
  )
}
