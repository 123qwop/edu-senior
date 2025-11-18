import { Box, Typography } from '@mui/material'

export default function AIRecommendations() {
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
        AI Recommendations
      </Typography>
      <Typography variant="body1" sx={{ color: 'neutral.500' }}>
        Your AI recommendations will appear here.
      </Typography>
    </Box>
  )
}

