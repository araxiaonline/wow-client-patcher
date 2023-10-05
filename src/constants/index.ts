const Channels = {
  WOW_LAUNCH: 'launch-wow',
  WOW_LAUNCH_ERROR: 'launch-wow-error',
  WOW_CLIENT_EXIT: 'launch-wow-exit',
  APP_INFO: 'app-info', // Initial application information
  APP_API: 'api-invoke',
  DOWNLOAD_START: 'download-start',
  DOWNLOAD_END: 'download-end',
  DOWNLOAD_PROGRESS: 'download-progress',
  DOWNLOAD_BATCH_START: 'download-batch-start',
  DOWNLOAD_BATCH_END: 'download-batch-end',
  DOWNLOAD_BATCH_DATA: 'download-batch-data',
  GET_UPDATE: 'get-update',
} as const;

const PLATFORM = {
  WINDOWS: 'win32',
  MAC: 'darwin',
  LINUX: 'linux',
} as const

export{
  Channels,
  PLATFORM,
}
