import { Box, Typography } from '@mui/material'

export default function Settings() {
  return (
    <Box sx={{ py: 4, flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'neutral.700', mb: 2 }}>
        Settings
      </Typography>
      <Typography variant="body1" sx={{ color: 'neutral.500' }}>
        Your settings will appear here.
      </Typography>
    </Box>
  )
}

