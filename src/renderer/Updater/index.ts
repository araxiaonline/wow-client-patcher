import axios from 'axios';
import conf from '../conf.json';

// export default class Updater {
//   private latest: UpdateInfo | null = null;

//   // Loads the lastest version of client data from the remote server.
//   public async fetchLatest(): Promise<UpdateInfo> {
//     const response = await axios.get<UpdateInfo>(`${conf.fileUrl}/latest.json`);
//     if (!response.data) {
//       throw new Error(
//         'Failed to determine the latest version from update server.'
//       );
//     }

//     this.latest = response.data;
//     return this.latest;
//   }
// }
