const Channels = {
  WOW_LAUNCH: 'launch-wow',
  WOW_LAUNCH_ERROR: 'launch-wow-error',
  WOW_CLIENT_EXIT: 'launch-wow-exit',
  APP_INFO: 'app-info',
} as const;

const PLATFORM = {
  WINDOWS: 'win32',
  MAC: 'darwin',
  LINUX: 'linux',
} as const

export default Channels;
export { PLATFORM };
