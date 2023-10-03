import path from 'path';
import { Downloader } from '../libs';
import config from '../config.json';

(async () => {

  const downloader = new Downloader({
    bucket: config.aws.bucket,
    root: path.resolve('../../../mockGame/'),
    s3config: config.aws,
  });

// downloader.on('start', ({response}) => {
//   console.log(response.ETag);
// });


downloader.on('batchData', (params) => {
  console.log('Downloads: ', params.downloadsStarted);
  console.log('Percentage: ', params.percentage);
});

downloader.on('batchStart', (params) => {
  console.log('Batch End: ', params);
});

downloader.on('batchEnd', (params) => {
  console.log('Batch End: ', params);
});

downloader.on('error', (params) => {
  console.log('An Error Occurred: ', params.error?.message);
});

try {
  await downloader.downloadFiles([
    { remotePath: 'addOns/AIO_Cklient.zip', localPath: 'AIO_Client.zip' },
    { remotePath: 'base/Wow.exe', localPath: 'WoW-test.exe'}
   ]);

} catch(Error) {
  // do nothing;
}
//  await downloader.downloadFile('addOns/AIO_Client.zip', 'AIO_Client.zip');


})();

