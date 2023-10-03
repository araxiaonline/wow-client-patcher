/* eslint-disable no-restricted-syntax */
import {
  S3Client,
  S3ClientConfig,
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import fs from "fs-extra";
import path from "path";
import stream from "node:stream";
import Emitter from "./Emitter";
import { santizeETag } from "../util";


export type DownloadEventMap = {
  start: {
    totalBytes: number;  // total bytes to download
    remoteFile: string;  // remote filepath being downloaded
    response?: GetObjectCommandOutput;
  };
  batchStart: {
    files: string[];
    totalBytes: number;
  };
  end: {
    totalBytes: number;  // total bytes downloaded
    file: string;        // local file path being saved
  };
  batchEnd: {
    files: string[];
    totalBytes: number;
  };
  data: {
    bytes: number;       // current chunk of bytes being downloaded
    totalBytes: number;  // total bytes downloaded
    percentage: number;  // percentage of download complete
    file: string;        // local file path being saved
  };
  batchData: {
    files: string[];
    bytes: number;
    totalBytes: number;
    percentage: number;
    downloadsStarted: number;
    downloadsEnded: number;
  };
  error: {
    error: Error | any;  // error object
  };
};


type DownloaderParams = {
  s3config: S3ClientConfig;
  bucket: string;
  root: string;           // root directory of game files
};

type BatchProgress = {
  numberOfFiles: number;
  totalBytes: number;
  completedBytes: number;
  currentProgress: number;
  downloadsStarted: number;
  downloadsEnded: number;
};

export default class Downloader extends Emitter<DownloadEventMap> {

  private s3: S3Client;
  private root: string;
  private bucket: string;

  constructor(params: DownloaderParams) {
    super();
    this.s3 = new S3Client(params.s3config);
    this.bucket = params.bucket;
    this.root = params.root;
  }

  /**
   * Downloads a file from the remote server and saves it to the local machine.
   * @param remotePath <string> | path to file on remote server
   * @param localPath <string> | path to save file to
   * @returns Promise<boolean> | true if download was successful, false otherwise
   */
  async downloadFile(remotePath: string, localPath: string): Promise<boolean> {
    const getObjectParams = {
      Bucket: this.bucket,
      Key: remotePath,
    };

    const writeStream = fs.createWriteStream(path.join(this.root, localPath));

    try {
      let totalDownloaded = 0;
      const response = await this.s3.send(new GetObjectCommand(getObjectParams));

      this.emit('start', {
        totalBytes: response.ContentLength || 0,
        remoteFile: remotePath,
        response
      });

      const body = response.Body as stream.Readable;
      body.on('data', (chunk) => {
        totalDownloaded += chunk.byteLength;
        const contentLength = response.ContentLength || 0;
        const progressPercentage =
          (totalDownloaded / contentLength) * 100;

        if (!(progressPercentage >= 100)) {
          this.emit('data', {
            bytes: chunk.byteLength,
            totalBytes: totalDownloaded,
            percentage: progressPercentage,
            file: localPath,
          });
        }

        writeStream.write(chunk);
      });

      body.on('end', () => {
        writeStream.end();
        this.emit('end', {
          totalBytes: totalDownloaded,
          file: localPath,
        });

        // this.updateManifest(remotePath, response.ETag || 'missing etag');
        writeStream.end();
      });

    } catch(error: Error | any) {
      error.message = `There was an issue downloading: ${remotePath} to ${localPath} Error: ${error.message}`;
      this.emit('error', { error });
      return false;
    }

    return true;
  }

  /**
   * Download a series of files in parallel and updates progress function as files are download.
   * @param fileList <{ remotePath: string; localPath: string }[]> | list of files to download
   * @param progress <FileProgress> | progress callback
   */
  async downloadFiles(fileList: { remotePath: string; localPath: string }[]): Promise<boolean> {

    const filesIndex: Record<string,number> = fileList.reduce((acc, file) => ({ ...acc, [file.localPath]: 0 }), {});
    const batch: BatchProgress = {
      totalBytes: 0,
      completedBytes: 0,
      currentProgress: 0,
      downloadsStarted: 0,
      downloadsEnded: 0,
      numberOfFiles: fileList.length,
    };

    // Handle each file starting a download for the batch
    this.on('start', ({totalBytes}) => {
      batch.totalBytes += totalBytes;
      batch.downloadsStarted += 1;

      if(batch.downloadsStarted === batch.numberOfFiles) {
        this.emit('batchStart', {
          files: Object.keys(filesIndex),
          totalBytes: batch.totalBytes,
        });
      }
    });

    this.on('end', ({totalBytes}) => {
      batch.completedBytes += totalBytes;
      batch.downloadsEnded += 1;

      if(batch.downloadsEnded === batch.numberOfFiles) {
        this.emit('batchEnd', {
          files: Object.keys(filesIndex),
          totalBytes: batch.totalBytes,
        });
      }
    });

    // This send batch progress of bytes and percentages.
    this.on('data', ({bytes, file}) => {
      filesIndex[file] += bytes;
      batch.currentProgress = Object.values(filesIndex).reduce((acc, curr) => acc + curr, 0);

      // With really small files or delays in processing the percentage here is not reliable, but will be close enough
      this.emit('batchData', {
        files: Object.keys(filesIndex),
        bytes,
        totalBytes: batch.currentProgress,
        percentage: ((batch.currentProgress / batch.totalBytes) * 100),
        downloadsStarted: batch.downloadsStarted,
        downloadsEnded: batch.downloadsEnded,
      });
    });

    try {
      await Promise.all(
        fileList.map(async (targetFile) => {
          await this.downloadFile(targetFile.remotePath, targetFile.localPath);
        })
      );
    } catch(err: Error | any) {
      this.emit('error', { error: err });
      return false;
    }

    return true;
  }

  /**
   * Get the ETag for a file on the remote server.
   * @param filename
   * @returns string | ETag for the file
   */
  async getETag(filename: string): Promise<string> {
    const localCache: Record<string, string> = {};
    const headCmd = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    });


    // check the local cache first to save the server request
    if(localCache[filename]) {
      return localCache[filename];
    }


    const response = await this.s3.send(headCmd);
    if(response.ETag) {
      const tag = santizeETag(response.ETag);
      localCache[filename] = tag;
      return tag;
    }

    return '';
  }

  /**
   * Gets the latest news from the server and returns it as a string.
   * @returns
   */
  async getLatestNews(): Promise<string | undefined> {
    const response = await this.s3.send(new ListObjectsCommand({
      Bucket: this.bucket,
      Prefix: 'news',
    }));

    let latestNews;
    let latestModified = new Date(0);
    for( const newsobject of response.Contents || []) {
      const modified = newsobject.LastModified || new Date(0);

      if(modified > latestModified) {
        latestNews = newsobject.Key;
        latestModified = modified;
      }
    }

    if(!latestNews) {
      return '';
    }

    const getResponse = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: latestNews,
    }));

    return getResponse.Body?.transformToString();
  }
}



