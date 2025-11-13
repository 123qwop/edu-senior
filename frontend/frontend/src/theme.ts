import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface PaletteColor {
    50?: string
    100?: string
    300?: string
    500?: string
    700?: string
  }
  interface SimplePaletteColorOptions {
    50?: string
    100?: string
    300?: string
    500?: string
    700?: string
  }
  interface Palette {
    neutral: Palette['primary']
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary']
  }
}

const theme = createTheme({
  palette: {
    primary: {
      50: '#EAF8FC',
      100: '#CDEDF7',
      main: '#2593BE',
      light: '#7ACCE6',
      dark: '#1B6E8D',
      contrastText: '#FAFAFA',
    },
    secondary: {
      main: '#6C63FF',
      light: '#B9A4FF',
    },
    success: {
      main: '#44C69B',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#EF4444',
    },
    neutral: {
      main: '#8A8D94',
      50: '#FAFAFA',
      100: '#F2F3F5',
      300: '#D4D6DA',
      500: '#8A8D94',
      700: '#4B4D52',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#4B4D52',
      secondary: '#8A8D94',
    },
  },
  typography: {
    fontFamily: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    body1: {
      color: '#4B4D52',
    },
    body2: {
      color: '#8A8D94',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderColor: '#D4D6DA',
            },
            '&:hover fieldset': {
              borderColor: '#8A8D94',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2593BE',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
        },
      },
    },
  },
})

export default theme
