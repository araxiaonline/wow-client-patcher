/* eslint-disable import/prefer-default-export */

// Removes double quotes on ETags from S3
export function santizeETag(tag: string): string {
  return tag.replace(/"/g, '');
}
