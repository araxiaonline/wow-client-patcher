import type { VersionStamp } from './App';

type ButtonProps = {
  versionStamp: VersionStamp;
  isDownloading: boolean;
  updater: () => void;
  launch: () => void;
}

export default function LaunchButton( { versionStamp, isDownloading, updater, launch } : ButtonProps) {

  const { status, oldVersion, newVersion } = versionStamp;
  return (
    <div className="flexbox">
      { !isDownloading && status === 'current' && <button type="button" onClick={launch}>Launch</button> }
      { isDownloading && <button type="button" disabled style={{ background: '#191919' }}>Updating</button> }
      { !isDownloading && status === 'update' && <button type="button" className='updatebtn' onClick={updater}>Update</button> }
  </div>
  );
}

