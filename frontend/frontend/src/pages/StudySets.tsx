import { Box, Typography } from '@mui/material'

export default function StudySets() {
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
        Study Sets
      </Typography>
      <Typography variant="body1" sx={{ color: 'neutral.500' }}>
        Your study sets will appear here.
      </Typography>
    </Box>
  )
}

