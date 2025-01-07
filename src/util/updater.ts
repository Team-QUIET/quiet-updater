import fs from 'fs';
import mv from 'mv';
import path from 'path';
import ftp from 'jsftp';
import crypto from 'crypto';
import { RemoteFileInfo, LogConfig } from './types';
import { of, from, defer, Observable, iif, EMPTY } from 'rxjs';
import {
  map,
  catchError,
  toArray,
  mergeMap,
  concatMap,
  tap,
} from 'rxjs/operators';
import { logEntry } from './logger';
import {
  MainLogDownloadFilePercentageStatusSubject,
  MainLogDownloadFileProgressStatusSubject,
} from '../containers/main/observables';
import { BASE_URI, DIR_QUIET_BIN, DOC_URI_GAMEPREFS } from '../constants';
import download from './download.util';
import api, { apiFileURI } from '../api/api';

/**
 * Type for FTP instance
 */
interface FTP extends ftp {
  auth(
    name: string,
    pass: string,
    callback: (err: Error | undefined) => void
  ): void;
}

/**
 * Determine the default log configuration by environment
 */
const defaultLogConfig: LogConfig = {
  channels: (process.env.REACT_APP_LOG_CONFIG_CHANNELS ?? 'main,log,file')
    .split(',')
    .map((x) => x.trim()) as LogConfig['channels'],
};

/**
 * Create a local file URI from given baseURI and path
 * @param baseURI
 * @param path
 */
const updaterCreateLocalFileURI = (baseURI: string, path: string) =>
  `${baseURI}/QUIET/${path}`.replace('\\', '/').replace('//', '/').trim();

/**
 * Create a remote file path from a RemoteFileInfo
 * @param fileInfo
 */
const updaterCreateRemoteFileURI = (fileInfo: RemoteFileInfo) =>
  `${fileInfo.path},0x${fileInfo.hash},${fileInfo.size}`;

/**
 * Extract the local dir for a file
 * @param fileURI
 */
const updaterCreateLocalFileDirURI = (fileURI: string) => {
  const chunks = fileURI.split('/');
  chunks.pop();
  return chunks.join('/');
};
/**
 * Convenience function for parsing a line from a CRC file into a RemoteFileInfo instance
 * @param fileEntry
 */
const updaterStringToRemoteFileInfo = (fileEntry: string): RemoteFileInfo => {
  const fixedFileEntry = fileEntry.replace('\\', '/').trim();
  const [path, hexsha, size] = fixedFileEntry.split(',');

  return {
    path,
    hash: hexsha.substr(2),
    size: Number.parseInt(size),
  };
};

/**
 * Fetch the CRC info from the server
 * @param logConfig
 */
const updaterGetCRCInfo$ = (logConfig: LogConfig = defaultLogConfig) =>
  new Observable<string>((subscriber) => {
    api
      .get<string>('SCFA_FileInfo.txt', { responseType: 'text' }, apiFileURI)
      .subscribe(
        (fileInfo) => {
          logEntry(
            `updaterGetCRCInfo$:auth:: Successfully connected to FTP`,
            'log',
            logConfig.channels
          );
          subscriber.next(fileInfo);
        },
        (e) => {
          logEntry(
            `updaterGetCRCInfo$:get:: ${e}`,
            'error',
            logConfig.channels
          );
          subscriber.error(e);
        },
        () => {
          subscriber.complete();
        }
      );
  });

/**
 * Convenience method for fetching and writing multiple files from the FTP
 * @param baseURI
 * @param fileInfos
 * @param logConfig
 */
const updaterGetAndWriteRemoteFiles$ = (
  baseURI: string = BASE_URI,
  fileInfos: RemoteFileInfo[],
  logConfig: LogConfig = defaultLogConfig
): Observable<[RemoteFileInfo[], RemoteFileInfo[]]> => {
  return new Observable((subscriber) => {
    const filesSucceeded: RemoteFileInfo[] = [];
    const filesFailed: RemoteFileInfo[] = [];
    logEntry(
      `updaterGetAndWriteRemoteFiles$:: start`,
      'log',
      logConfig.channels
    );
    from(fileInfos)
      .pipe(
        concatMap((fileInfo, fii) => {
          if (fii === 0) {
            MainLogDownloadFileProgressStatusSubject.next([
              fii + 1,
              fileInfos.length,
            ]);
          }

          return new Observable<[RemoteFileInfo, boolean]>((sub) => {
            MainLogDownloadFileProgressStatusSubject.next([
              Math.min(fii + 2, fileInfos.length),
              fileInfos.length,
            ]);
            try {
              logEntry(
                `updaterGetAndWriteRemoteFiles$:: Downloading => ${path.join(
                  apiFileURI,
                  encodeURI(fileInfo.path)
                )}`,
                'log',
                logConfig.channels
              );
              let percentDownloaded = 0;
              download(
                path.join(apiFileURI, encodeURI(fileInfo.path)),
                path.join(baseURI, fileInfo.path),
                (_, perc, done) => {
                  if (perc && percentDownloaded !== Math.round(perc)) {
                    percentDownloaded = perc;
                    MainLogDownloadFilePercentageStatusSubject.next(perc);
                  }
                  if (done) {
                    sub.next([fileInfo, true]);
                    logEntry(
                      `updaterGetAndWriteRemoteFile$:: ${fileInfo.path} downloaded`
                    );
                    sub.complete();
                  }
                }
              );
            } catch (err) {
              logEntry(
                `updaterGetAndWriteRemoteFiles$:: ${err}`,
                'error',
                logConfig.channels
              );
            }
          });
        })
      )
      .subscribe(
        ([fileInfo, success]) => {
          if (success) {
            filesSucceeded.push(fileInfo);
          } else {
            filesFailed.push(fileInfo);
          }
        },
        (e) => {
          logEntry(`updaterGetAndWriteRemoteFiles$::inner: ${e}`);
        },
        () => {
          subscriber.next([filesSucceeded, filesFailed]);
          subscriber.complete();
        }
      );
  });
};

/**
 * Generate RemoteFileInfo from the remote CRC files' content
 * @param remoteFileContent
 */
const updaterParseRemoteFileContent = (
  remoteFileContent: string
): RemoteFileInfo[] =>
  remoteFileContent
    .replace(/\\+/gi, '/')
    .replace(/^\s+|\s+$/g, '')
    .split(/\r?\n/)
    .map((line) => updaterStringToRemoteFileInfo(line));

/**
 * Retrieve a buffer from a local file
 * @param path
 * @param logConfig
 */
const updaterLocalFileData$ = (
  path: string,
  logConfig: LogConfig = defaultLogConfig
): Observable<Buffer> =>
  defer(() =>
    from<Promise<Buffer>>(
      new Promise((res, rej) => {
        fs.readFile(path, (err, data) => {
          if (err) {
            logEntry(`${err}`, 'error', logConfig.channels);
            rej(err);
          }
          res(data);
        });
      })
    )
  );

/**
 * Compare given [[RemoteFileInfo]] to local counterpart
 * @param fileInfo
 */
const updaterCompareRemoteFileInfo$ = (
  fileInfo: RemoteFileInfo,
  baseURI: string,
  logConfig: LogConfig = defaultLogConfig
): Observable<[RemoteFileInfo, boolean]> =>
  of(fileInfo).pipe(
    concatMap((info) =>
      updaterLocalFileData$(
        updaterCreateLocalFileURI(baseURI, fileInfo.path),
        logConfig
      ).pipe(
        map((data) => {
          if (
            info.path.toLowerCase().includes('louddatapath.lua') &&
            data.byteLength
          ) {
            return true;
          }
          const shacrypto = crypto.createHash('sha1');
          shacrypto.update(data);
          const result = shacrypto.digest('hex').toUpperCase();
          shacrypto.destroy();
          const resultBoolean =
            result === info.hash && data.byteLength === info.size;

          return resultBoolean;
        }),
        map((result) => [info, result] as [RemoteFileInfo, boolean]),
        tap(([info, result]) => {
          logEntry(
            `CompareRemoteFileInfo$::${updaterCreateRemoteFileURI(
              info
            )} / ${result}`,
            'log',
            logConfig.channels.filter((channel) => channel !== 'main')
          );
        })
      )
    ),
    catchError((err) => {
      logEntry(
        `CompareRemoteFileInfo$::${updaterCreateRemoteFileURI(
          fileInfo
        )} / ${err}`,
        'error',
        logConfig.channels
      );

      return of([fileInfo, false] as [RemoteFileInfo, boolean]);
    })
  );

/**
 * Determine which files are out of sync by comparing the remote CRC with a locally created CRC.
 * @param fileInfos
 * @param baseURI
 * @param logConfig
 */
const updaterCollectOutOfSyncFiles$ = (
  fileInfos: RemoteFileInfo[],
  baseURI: string,
  logConfig: LogConfig = defaultLogConfig
) => {
  logEntry(
    'updaterCollectOutOfSyncFiles$:: Start gathering files that are out-of-sync'
  );
  return from(fileInfos).pipe(
    concatMap((info) =>
      updaterCompareRemoteFileInfo$(info, baseURI, logConfig).pipe(
        mergeMap(([info, result]) => iif(() => !!result, EMPTY, of(info)))
      )
    ),
    toArray()
  );
};
/**
 * Excluded partial paths from the CRC creator
 */
const excludeCRC = [
  'louddatapath.lua',
  '.unsupported',
  'usermaps',
  'usermods',
  'usergamedata',
  'loud.log',
  '.scfareplay',
];

/**
 * Create a local CRC to be used as a source on the server
 */
const updaterCreateLocalCRC$ = (logConfig = defaultLogConfig) => {
  logEntry('updaterCreateLocalCRC$:: Starting the CRC Process');
  return from(
    new Promise((res, rej) => {
      const walk = (
        dir: string,
        done: (err: Error | null, results?: string[]) => void
      ) => {
        var results: string[] = [];
        fs.readdir(dir, (err, list) => {
          if (err) {
            return done(err);
          }
          var pending = list.length;
          if (!pending) {
            return done(null, results);
          }
          list.forEach((file) => {
            file = path.resolve(dir, file);
            fs.stat(file, (_err, stat) => {
              if (stat && stat.isDirectory()) {
                walk(file, (_err, res) => {
                  results = results.concat(res!);
                  if (!--pending) done(null, results);
                });
              } else {
                results.push(file);
                if (!--pending) done(null, results);
              }
            });
          });
        });
      };
      walk(`${BASE_URI}/QUIET`, (err, results) => {
        if (err || !results) {
          logEntry(
            `updaterCreateLocalCRC$:walk::${err} / ${results}`,
            'error',
            logConfig.channels
          );
          rej(err);
          return;
        }
        const crcs = results
          .filter((res) => {
            return (
              !excludeCRC.find((ex) => res.toLowerCase().includes(ex)) &&
              !res.toLowerCase().includes('.log')
            );
          })
          .map((result) => {
            const buffer = fs.readFileSync(result);
            const fileURI = path
              .normalize(result)
              .replace(path.normalize(`${BASE_URI}/QUIET/`), '');
            const shacrypto = crypto.createHash('sha1');
            shacrypto.update(buffer);
            const sha1 = shacrypto.digest('hex').toUpperCase();
            shacrypto.destroy();
            return `${fileURI},0x${sha1},${buffer.byteLength}`;
          });
        crcs.push(
          'bin\\LoudDataPath.lua,0xE0A4D83007A0222CD1EDBD77E6CFA81BB2F32252,1499'
        );
        crcs.sort();
        fs.writeFile(
          `${BASE_URI}/SCFA_FileInfo.txt`,
          crcs.join('\r\n'),
          (err) => {
            if (err) {
              logEntry(
                `Could not generate CRC file ${err}`,
                'error',
                logConfig.channels
              );
              rej(err);
              return;
            }
            logEntry(
              'updaterCreateLocalCRC$:: Finished the CRC Process. The file is located at ./SCFA_FileInfo.txt',
              'log',
              logConfig.channels
            );
            // @ts-ignore
            res();
          }
        );
      });
    })
  );
};

const updaterCleanupGameData$ = (
  fileInfos: RemoteFileInfo[],
  logConfig = defaultLogConfig
) => {
  logEntry(
    'updaterCleanupGamedata$:: Starting gamedata cleanup',
    'log',
    logConfig.channels.filter((channel) => channel !== 'main')
  );
  const gamedataInCRC = fileInfos.reduce((acc, fi) => {
    if (fi.path.startsWith('gamedata')) {
      acc.push(fi.path.replace(/\//g, '\\').split('\\')[1]);
    }
    return acc;
  }, [] as string[]);
  return from(
    new Promise((res) => {
      fs.statSync(`${BASE_URI}/QUIET/gamedata`);
      fs.readdir(`${BASE_URI}/QUIET/gamedata`, (err, entries) => {
        if (err) {
          logEntry(
            `updaterCleanupGamedata$:: ${err}`,
            'error',
            logConfig.channels
          );
        }
        const falseEntries = entries.filter((e) => !gamedataInCRC.includes(e));
        for (let entry of falseEntries) {
          if (entry.toLowerCase().includes('advanced strategic icons')) {
            logEntry(
              `updaterCleanupGamedata$:mv:: Skipping Advanced strategic icons`,
              'log',
              ['file', 'log']
            );
            continue;
          }
          if (
            entry.toLowerCase().includes('lua') &&
            !entry.toLowerCase().includes('.scd')
          ) {
            logEntry(
              `updaterCleanupGamedata$:mv:: Skipping generated LUA`,
              'log',
              ['file', 'log']
            );
            continue;
          }
          fs.unlink(`${BASE_URI}/QUIET/gamedata/${entry}`, (errMv) => {
            if (errMv) {
              logEntry(`updaterCleanupGamedata$:mv:: ${errMv}`);
            }
          });
        }
        res(!!falseEntries.length);
      });
    })
  );
};

const updaterCleanupMaps$ = (
  fileInfos: RemoteFileInfo[],
  logConfig = defaultLogConfig
) => {
  logEntry(
    'updaterCleanupMaps$:: Starting Maps cleanup',
    'log',
    logConfig.channels.filter((channel) => channel !== 'main')
  );
  const mapsInCRC = fileInfos.reduce((acc, fi) => {
    if (fi.path.startsWith('maps')) {
      acc.push(fi.path.replace(/\//g, '\\').split('\\')[1]);
    }
    return acc;
  }, [] as string[]);
  return from(
    new Promise((res) => {
      fs.statSync(`${BASE_URI}/QUIET/maps`);
      fs.readdir(`${BASE_URI}/QUIET/maps`, (err, entries) => {
        if (err) {
          logEntry(`updaterCleanupMaps$:: ${err}`, 'error', logConfig.channels);
        }
        const falseEntries = entries.filter((e) => !mapsInCRC.includes(e));
        if (falseEntries.length) {
          logEntry(
            `updaterCleanupMaps$:: Found extraneous items ${JSON.stringify(
              falseEntries
            )}. Moving to maps.unsupported.`,
            'log',
            logConfig.channels
          );
          logEntry(
            'External maps and mods are to be placed in your "<Drive>:\\Users\\<your account>\\My Games\\Gas Powered Games\\Maps / Mods" folders and will be only loaded if they are toggled on in the launcher',
            'warn',
            logConfig.channels
          );
        }
        if (!falseEntries.length) {
          // @ts-ignore
          res();
          return;
        }
        fs.mkdirSync(`${BASE_URI}/QUIET/maps.unsupported`, { recursive: true });
        for (let entry of falseEntries) {
          mv(
            `${BASE_URI}/QUIET/maps/${entry}`,
            `${BASE_URI}/QUIET/maps.unsupported/${entry}`,
            (errMv) => {
              if (errMv) {
                logEntry(`updaterCleanupMaps$:mv:: ${errMv}`);
              }
            }
          );
        }
        res(!!falseEntries.length);
      });
    })
  );
};

const updaterCleanupMods$ = (logConfig = defaultLogConfig) => {
  logEntry(
    'updaterCleanupMods$:: Starting Mods cleanup',
    'log',
    logConfig.channels.filter((channel) => channel !== 'main')
  );
  return from(
    new Promise((res) => {
      fs.stat(`${BASE_URI}/QUIET/mods`, (err) => {
        if (err) {
          if (err.message.includes('ENOENT')) {
            // @ts-ignore
            res();
            return;
          }
          logEntry(`${err}`, 'error', logConfig.channels);
          throw err;
        }
        const entries = fs.readdirSync(`${BASE_URI}/QUIET/mods`);
        if (entries.length) {
          logEntry(
            'External maps and mods are to be placed in your "<Drive>:\\Users\\<your account>\\My Games\\Gas Powered Games\\Maps / Mods" folders and will be only loaded if they are toggled on in the launcher',
            'warn',
            logConfig.channels
          );
        }
        fs.mkdir(`${BASE_URI}/QUIET/mods.unsupported`, () => {
          for (let entry of entries) {
            mv(
              `${BASE_URI}/QUIET/mods/${entry}`,
              `${BASE_URI}/QUIET/mods.unsupported/${entry}`,
              (err) => {
                if (err) {
                  logEntry(
                    `updaterCleanupMods$:: ${err}`,
                    'error',
                    logConfig.channels
                  );
                }
              }
            );
          }
        });
      });
    })
  );
};

const updaterCleanupUserprefs$ = (logConfig = defaultLogConfig) => {
  logEntry(
    'updaterCleanupGameprefs$:: Starting user preferences cleanup',
    'log',
    logConfig.channels.filter((channel) => channel !== 'main')
  );
  return from(
    new Promise((res, rej) => {
      fs.statSync(DOC_URI_GAMEPREFS);
      const buffer = fs.readFileSync(DOC_URI_GAMEPREFS);
      let fileStr = buffer.toString();
      fileStr = fileStr.replace(/fidelity = \d/g, 'fidelity = 2');
      fileStr = fileStr.replace(/shadow_quality = \d/g, 'shadow_quality = 3');
      fileStr = fileStr.replace(/texture_level = \d/g, 'texture_level = 2');
      fileStr = fileStr.replace(/level_of_detail = \d/g, 'level_of_detail = 2');
      fs.writeFileSync(DOC_URI_GAMEPREFS, fileStr);
      // @ts-ignore
      res();
    })
  );
};

export {
  updaterCleanupGameData$,
  updaterCleanupMaps$,
  updaterCleanupMods$,
  updaterCleanupUserprefs$,
  updaterCreateLocalCRC$,
  updaterGetCRCInfo$,
  updaterParseRemoteFileContent,
  updaterCompareRemoteFileInfo$,
  updaterStringToRemoteFileInfo,
  updaterLocalFileData$,
  updaterCollectOutOfSyncFiles$,
  updaterGetAndWriteRemoteFiles$,
};
