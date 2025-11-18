import { Box, Typography } from '@mui/material'

export default function Subjects() {
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
        My Subjects
      </Typography>
      <Typography variant="body1" sx={{ color: 'neutral.500' }}>
        Your subjects will appear here.
      </Typography>
    </Box>
  )
}

