import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#0D6EFD' },
    background: { default: '#F8F9FA' },
  },
  shape: { borderRadius: 16 }, // bordes redondos en todo
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiCard:  { styleOverrides: { root: { borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' } } },
    MuiButton:{ styleOverrides: { root: { textTransform: 'none', borderRadius: 12, fontWeight: 600 } } },
    MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } } } },
    MuiFormControl: { styleOverrides: { root: { '& .MuiInputBase-root': { borderRadius: 12 } } } },
    MuiTableContainer: { styleOverrides: { root: { borderRadius: 16 } } },
  },
});

export default theme;
