import {
  BASE_URI,
  URI_EU_MIRROR_7ZIP_DLL,
  URI_EU_MIRROR_7ZIP_EXE,
  URI_EU_MIRROR_QUIET,
} from '../constants';
import { logEntry } from './logger';
import download, { DownloadProgressCallback } from './download.util';

const verbose = false;

const fetchMirror = async (
  onProgress: DownloadProgressCallback,
  onComplete?: () => void
) => {
  download(URI_EU_MIRROR_7ZIP_DLL, `${BASE_URI}/7z.dll`, (_, perc) => {
    if (verbose)
      logEntry(`${BASE_URI}/7z.dll: ${perc}/100 ${BASE_URI}`, 'log', [
        'log',
        'main',
      ]);
  });
  download(URI_EU_MIRROR_7ZIP_EXE, `${BASE_URI}/7z.exe`, (_, perc) => {
    if (verbose)
      logEntry(`${BASE_URI}/7z.exe: ${perc}/100 ${BASE_URI}`, 'log', [
        'log',
        'main',
      ]);
  });
  download(URI_EU_MIRROR_QUIET, `${BASE_URI}/QUIET.7z`, (bytes, perc, done) => {
    if (verbose)
      logEntry(`${BASE_URI}/QUIET.7z: ${perc}/100 ${BASE_URI}`, 'log', [
        'log',
        'main',
      ]);
    if (onProgress) {
      onProgress(bytes, perc, done);
    }
    if (done && onComplete) {
      onComplete();
    }
  });
};

export default fetchMirror;
