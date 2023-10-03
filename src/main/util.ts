/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export function byteToMbs(bytes: number): number {
  return +(bytes/1024/1024).toFixed(2);
}

// Removes double quotes on ETags from S3
export function santizeETag(tag: string): string {
  return tag.replace(/"/g, '');
}
