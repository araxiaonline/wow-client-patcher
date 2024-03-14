/* eslint global-require: off, no-console: off, promise/always-return: off */
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import  throttle from 'lodash/throttle';
/* eslint-disable */

// Assets
import './App-wotlk.css';
import icon from '../../assets/warcraft-logo.png';
import wowInstalled from '../../assets/wow-icon.png';
import hdIcon from '../../assets/hd-icon.png';
import moneyIcon from '../../assets/money2-icon.png';
import musicIcon from '../../assets/music-icon.png';

// Common Types
import { LauncherServer, WowLauncher, DownloadCallbacks } from '../typings';

// MUI Components
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import { Alert } from '@mui/material';

// App Components
import VersionText from './VersionText';
import LaunchButton from './LaunchButton';
import Snowfall from 'react-snowfall';

// Configuration variables
import  config from '../main/config.json';

export type VersionStamp = {
  status: 'update' | 'current' | 'unknown',
  newVersion: string,
  oldVersion: string
};


declare const window: Window;

function WoWClientPatcher() {

  const [appInfo, setAppInfo] = useState<WowLauncher.AppInfo | null>();
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [versionStamp, setVersionStamp] = useState<VersionStamp>({
    status: 'unknown',
    newVersion: '',
    oldVersion: ''
  });

  const updateAppInfo = async () => {
    const data = await window.api.GetAppInfo();
    setAppInfo(data);
  }

  useEffect(() => {
    const getAppInfo = async () => {

      try {
        let data = await window.api.GetAppInfo();
        console.log(data);
        setAppInfo(data);

        if(appInfo && !appInfo.AIOInstalled && !isDownloading) {
          window.api.InstallStore({
            data: (data) => {
              setIsDownloading(true);
            },
            end: async ({totalBytes, file}) => {
              setIsDownloading(false);

              setTimeout(() => {
                updateAppInfo();
              }, 500);
            },
          } as DownloadCallbacks);
        }

      } catch(error: any) {
        console.log(error);

        // do a retry here and hope for the best
        setTimeout(async () => {
          let data = await window.api.GetAppInfo();
          setAppInfo(data);
        }, 500);
      }

    };

    getAppInfo();
  },[]);

  const launch = () => {
    window.api.Launch();
  };

  // Install WoW Client
  const installWow = () => {
    if(appInfo?.WoWPatched) {
      return;
    }

    window.api.PatchWoW();
    setTimeout(() => {
      updateAppInfo();
    }, 150);
  }

  const batchCallbacks: DownloadCallbacks = {
      batchStart: (data) => {
        setIsDownloading(true);
        // console.log('start:', data);
      },
      batchData: throttle((data: any) => {
        setIsDownloading(true);
        // console.log('progress:', data);
        setDownloadProgress(Math.floor(data.percentage));
      }, 500),
      batchEnd: (data) => {
        setTimeout(() => {
          setIsDownloading(false);

          setDownloadProgress(0);
          updateAppInfo();
        }, 500);
      }
  };

  window.batchCallbacks = batchCallbacks;

  const installHD = async () => {
    if(appInfo?.HD || isDownloading) {
      return;
    }

    window.api.InstallHD(batchCallbacks);
  }

  const installMisc = async () => {
    if(appInfo?.Misc || isDownloading) {
      return;
    }

    window.api.InstallMisc(batchCallbacks);
  }

  const installUpdates = async () => {
    if(appInfo?.Version === appInfo?.RemoteVersion) {
      return;
    }
    if(isDownloading) {
      return;
    }

    window.api.InstallUpdates(batchCallbacks);
  }

  const getUpdate = () => {
    window.api.GetUpdate();
  }

  useEffect(() => {

    if(appInfo?.Version && appInfo?.Version !== appInfo?.RemoteVersion) {
      setVersionStamp({
        status: 'update',
        newVersion: appInfo?.RemoteVersion || '',
        oldVersion: appInfo?.Version || '',
      });
    } else {
      setVersionStamp({
        status: 'current',
        newVersion: appInfo?.RemoteVersion || '',
        oldVersion: appInfo?.Version || '',
      });
    }

  }, [appInfo]);

  return (
    <Container maxWidth="md" sx={{ border: 0 }}>
      <div className="snowfall">
        {
          <Snowfall
            changeFrequency={150}
            speed={[2.5, 20]}
            wind={[2.0, 5.0]}
            color="rgba(200,220,230,0.35)"
          />
        }
        {/*<Snowfall
          changeFrequency={50}
          speed={[1.0, 2]}
          wind={[1.0, 1.0]}
          color="rgba(15,90,20,0.55)"
          snowflakeCount={50}
      />*/}
      </div>
      <div className="wowlogo">
        <img width="300px" alt="icon" src={icon} />
      </div>
      {appInfo ? (
        <Box
          sx={{
            bgcolor: 'rgba(0,40,60,0.55)',
            padding: '0px 10px 5px 10px',
            boxShadow: '0px 0px 20px 0px rgba(0,0,0,0.55)',
          }}
        >
          {/* WoW Client component */}
          <Grid
            container
            direction="row"
            height="100%"
            alignItems="center"
            padding={1}
          >
            <Grid xs={12} paddingLeft={2}>
              <Card
                sx={{
                  maxWidth: '105%',
                  backgroundColor: 'rgba(30,30,40,0.8)',
                  color: 'white',
                  border: '1px solid rgba(254,223,164,0.6)',
                }}
              >
                {/* <CardActionArea
                  sx={{
                    '&:hover': {
                      width: 'inherit',
                      height: 'inherit',
                      border: 'none',
                      // Remove the hover effect by specifying the same styles as the default state
                      backgroundColor: 'transparent', // Or any other desired styles
                      boxShadow: 'none', // Or any other desired styles
                      animation: 'none',
                      transform: 'none',
                      opacity: 'inherit',
                    },
                  }}
                > */}
                <CardContent
                  className="news"
                  sx={{ minHeight: '260px', maxHeight: '295px',width: '95%' }}
                >
                  <Typography gutterBottom variant="h6" component="div">
                    {config.clientText.newsTitle}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      maxHeight: '280px',
                      overflowY: 'scroll',
                      textOverflow: 'ellipsis',
                    }}
                    component="div"
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: appInfo?.LatestNews,
                      }}
                    ></div>
                  </Typography>
                </CardContent>
                {/* </CardActionArea> */}
                {/* <CardActions sx={{ justifyContent: 'right' }}>
                  <Button size="medium" color="inherit">
                    Past News
                  </Button>
                </CardActions> */}
              </Card>
            </Grid>
          </Grid>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '20px',
              visibility: isDownloading ? 'visible' : 'hidden',
            }}
          >
            <Box sx={{ width: '100%', mr: 1, justifyItems: 'center' }}>
              <LinearProgress
                sx={{
                  height: '10px',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                }}
                variant="determinate"
                value={downloadProgress}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography
                variant="body1"
                color="white"
                component="div"
              >{`${downloadProgress}%`}</Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'right',
              padding: '3px',
            }}
          >
            <VersionText {...versionStamp} />
            <LaunchButton
               isDownloading={isDownloading}
               launch={launch}
               versionStamp={versionStamp}
               updater={installUpdates}
            />
          </Box>
        </Box>
      ) : (
        <div className="overlayContainer">
            <div className="overlay error">
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>

              <CircularProgress size={100} color="info"/>
            </Box>
             </div>
        </div>
      )}


      <br />
      {/* <Box sx={{ justifyContent: 'center', textAlign: 'center', justifyItems: 'center'}}>
      { appInfo?.AppVersion !== appInfo?.LatestAppVersion &&
        <Alert onClick={getUpdate} sx={{
          width: '40%',
          left: '30%',
          position: 'absolute',
          backgroundColor: 'rgba(0,0,0,0.70)',
          color: 'rgba(11,207,47, 1.0)',
          cursor: 'pointer',
        }} severity="info">A newer version of this launcher can be download by clicking <b>here</b></Alert> }
      </Box> */}
    </Container>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WoWClientPatcher />} />
      </Routes>
    </Router>
  );
}
