/* eslint global-require: off, no-console: off, promise/always-return: off */
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
/* eslint-disable */
import Snowfall from 'react-snowfall';

import './App.css';
import icon from '../../assets/warcraft-logo.png';
import { LauncherServer, WowLauncher } from '../typings';
import BadgeList from './BadgeList';

declare const window: Window;

function WoWClientPatcher() {

  const [appInfo, setAppInfo] = useState<WowLauncher.AppInfo | null>();

  useEffect(() => {

    const getAppInfo = async () => {
      const data = await window.api.GetAppInfo();
      setAppInfo(data);
    };

    getAppInfo();
  },[]);

  const launch = () => {
    window.api.Launch();
  };

  return (
    <div style={{height:"480px"}}>
      <div className="eyes"></div>
      <div className="snowfall">
        <Snowfall
          changeFrequency={150}
          speed={[2.5, 20]}
          wind={[2.0, 5.0]}
          color="rgba(200,220,230,0.35)"
        />
      </div>
      <div className="wowlogo">
        <img width="300px" alt="icon" src={icon} />
      </div>
      <div className="overlay">
        <div className="versionText">
          <h2>Installed</h2>
          <BadgeList appInfo={appInfo} />

          <div className="container">
            <div className="left-content">
              <span className="new">Version v4 released:</span> Click upgrade to download and review patch notes.
            </div>
            <div className="right-content">
              {appInfo?.version}
            </div>
          </div>
          {/* <div className="flexbox">
            <h3>v{appInfo?.version}</h3>
          </div> */}


          {/* <h3>
            New Version: &nbsp;
            <span className="latest">3.3.5-v11</span>
          </h3> */}
        </div>
      </div>

      <div className="flexbox">
        <button type="button" onClick={launch}>
          {/* <span role="img" aria-label="books">
            </span> */}
          Launch
        </button>
        {/* <button className="action-install" type="button" onClick={launch}>
          Install
        </button> */}
      </div>
    </div>
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
