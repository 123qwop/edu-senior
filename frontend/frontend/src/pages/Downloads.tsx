import { Box, Typography } from '@mui/material'

export default function Downloads() {
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
        Offline Downloads
      </Typography>
      <Typography variant="body1" sx={{ color: 'neutral.500' }}>
        Your offline downloads will appear here.
      </Typography>
    </Box>
  )
}

