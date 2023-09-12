import React from 'react';
import { WowLauncher } from '../../typings';
import './BadgeList.css';

function BadgeList({ appInfo }: { appInfo: WowLauncher.AppInfo | null | undefined}) {
  return (
    <div className="badge-list">
      <ul className="badge-row">
        <li className={`badge-item ${appInfo?.HD ? 'green' : 'red'}`}>
          <div className="badge">{appInfo?.HD ? '✓' : '✕'}</div>
          <div className="badge-text">HD Models</div>
        </li>
        <li className={`badge-item ${appInfo?.HDExtra ? 'green' : 'red'}`}>
          <div className="badge">{appInfo?.HDExtra ? '✓' : '✕'}</div>
          <div className="badge-text">HD Textures</div>
        </li>
      </ul>
      <ul className="badge-row">
        <li className={`badge-item ${appInfo?.Features ? 'green' : 'red'}`}>
          <div className="badge">{appInfo?.Features ? '✓' : '✕'}</div>
          <div className="badge-text">Features</div>
        </li>
        <li className={`badge-item ${appInfo?.Araxia ? 'green' : 'red'}`}>
          <div className="badge">{appInfo?.Araxia ? '✓' : '✕'}</div>
          <div className="badge-text">Araxia</div>
        </li>
      </ul>
    </div>
  );
}

export default BadgeList;
