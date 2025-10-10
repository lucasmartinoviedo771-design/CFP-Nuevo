import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#0D6EFD' },
    secondary: { main: '#6C757D' },
    success: { main: '#198754' },
    warning: { main: '#FFC107' },
    error: { main: '#DC3545' },
    background: { default: '#F8F9FA' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F8F9FA' },
      },
    },
    MuiPaper: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiCard:  { styleOverrides: { root: { borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' } } },
    MuiButton:{ styleOverrides: { root: { textTransform: 'none', borderRadius: 12, fontWeight: 600 } } },
    MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } } } },
    MuiFormControl: { styleOverrides: { root: { '& .MuiInputBase-root': { borderRadius: 12 } } } },
    MuiTableContainer: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

export default theme;
