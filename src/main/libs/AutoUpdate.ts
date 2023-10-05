import axios from 'axios';
import fs from 'fs';

export default class AutoUpdater {
  private owner: string;
  private repo: string;

  constructor() {
    this.owner = 'araxiaonline';
    this.repo = 'wow-client-patcher';
  }

  async getLatestVersion(): Promise<string | null> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`
      );

      if (response.status === 200 && response.data.tag_name) {
        return response.data.tag_name;
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  async downloadLatest(outputPath: string): Promise<boolean> {
    const latestVersion = await this.getLatestVersion();
    if (!latestVersion) {
      return false;
    }

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`
      );

      if (response.status === 200 && response.data.assets) {
        const binaryAsset = response.data.assets.find(
          (asset: any) => asset.name.endsWith('.exe')
        );

        if (!binaryAsset) {
          return false;
        }

        const binaryUrl = binaryAsset.browser_download_url;
        const writer = fs.createWriteStream(outputPath);
        const responseStream = await axios.get(binaryUrl, { responseType: 'stream' });

        responseStream.data.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on('finish', () => {
            resolve(true);
          });

          writer.on('error', (err) => {
            fs.unlinkSync(outputPath);
            // eslint-disable-next-line prefer-promise-reject-errors
            reject(false);
          });
        });
      }
        return false;

    } catch (error) {
      return false;
    }
  }
}
