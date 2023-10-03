import { Typography } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { VersionStamp } from './App';


const theme = createTheme();
theme.typography.caption = {
  fontFamily: 'consolas',
  fontSize: '12px',
  fontWeight: 400,

};


export default function VersionText( versionStamp : VersionStamp) {

  const { status, oldVersion, newVersion } = versionStamp;
  return (
    <ThemeProvider theme={theme}>
      {status === 'unknown' && <Typography variant="caption">3.3.5a</Typography>}
      {status === 'update' && <Typography variant="caption">3.3.5a-{oldVersion} <span className='new'>latest({newVersion})</span></Typography>}
      {status === 'current' && <Typography variant="caption">3.3.5a-{oldVersion}</Typography>}
    </ThemeProvider>
  );
}

