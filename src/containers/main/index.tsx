import React, {
  FunctionComponent,
  useState,
  useEffect,
  useCallback,
  useContext,
} from 'react';
import fs from 'fs';
import path from 'path';
import MainButtons from './MainButtons';
import {
  updaterCollectOutOfSyncFiles$,
  updaterGetCRCInfo$,
  updaterParseRemoteFileContent,
  updaterGetAndWriteRemoteFiles$,
  updaterCleanupMaps$,
  updaterCleanupMods$,
  updaterCleanupGameData$,
  updaterCleanupUserprefs$,
} from '../../util/updater';
import { UpdateStatus } from './constants';
import { logEntry } from '../../util/logger';
import { switchMap, tap } from 'rxjs/operators';
import { iif, EMPTY } from 'rxjs';
import { RemoteFileInfo } from '../../util/types';
import MainLog from './MainLog';
import {
  BASE_URI,
  DIR_QUIET_USERMAPS,
  DIR_QUIET_USERMODS,
  DIR_QUIET_USERMODS_LCE_ZIP,
  DIR_QUIET_USERMODS_M28_ZIP,
} from '../../constants';
import rungame from '../../util/rungame';
import checkFolder from '../../util/checkFolder';
import { ipcRenderer } from 'electron';
import testWrite from '../../util/testWrite';
import createUserDirectories from '../../util/createUserDirectories';
import MainContext from './MainContext';
import { Typography, makeStyles } from '@material-ui/core';
import openTarget, { openTargetCheck, targetURI } from '../../util/openTarget';
import createDocumentsDirectories$ from '../../util/createDocumentsDirectories';
import {
  MainLogDownloadFilePercentageStatusSubject,
  MainLogDownloadFileProgressStatusSubject,
} from './observables';
import MainUpdateDialog from './MainUpdateDialog';
import toggleUserContent, {
  checkUserContent,
} from '../../util/toggleUserContent';
import { GlobalHotKeys } from 'react-hotkeys';
import mapSync$ from '../../util/mapSync';
import mapSyncWrite$ from '../../util/mapSyncWrite';
import fetchMirror from '../../util/fetchMirror';
import unpackMirror from '../../util/unpackMirror';
import checkCleanInstall from '../../util/checkCleanInstall';
import checkLCEUpdate$ from '../../util/checkLCEUpdate';
import download from '../../util/download.util';
import unpackZIP$ from '../../util/unpackZIP';
import checkM28Update$ from '../../util/checkM28Update';
import rimraf from 'rimraf';
import MainVersion from './MainVersion';
const remote = require('@electron/remote');

const useStyles = makeStyles((theme) => ({
  userContentWrapper: {
    position: 'absolute',
    bottom: 0,
    right: theme.spacing(0.5),
    color: 'white',
    width: 290,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userContentLabel: {
    fontWeight: theme.typography.fontWeightLight,
    fontSize: theme.typography.fontSize * 0.9,
  },
  background: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundImage: `url('${require('../../assets/quietLauncherSplash_1.png')}')`,
    backgroundSize: 'contain',
    backgroundPosition: '50% 50%',
    flexDirection: 'column-reverse',
  },
}));

const keyMap = {
  openMap: 'ctrl+alt+p',
};

const Main: FunctionComponent = () => {
  const classes = useStyles();
  const { enabledItems, changeEnabledItem } = useContext(MainContext);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(
    UpdateStatus.NotChecked
  );

  useEffect(() => {
    checkCleanInstall().subscribe(
      () => {
        setUpdateStatus(UpdateStatus.NotChecked);
      },
      (e) => {
        setUpdateStatus(UpdateStatus.CleanInstall);
      }
    );
    checkFolder().subscribe(
      () => {
        logEntry('Client is in correct folder', 'log', ['file']);
      },
      (e) => {
        logEntry('Client is not in correct folder', 'error', ['file']);
        remote.dialog.showErrorBox(
          'Error!',
          'Please put the client in the root of your Supreme Commander folder i.e. C:\\SteamLibrary\\steamapps\\common\\Supreme Commander Forged Alliance'
        );
        remote.app.quit();
      }
    );
    testWrite().subscribe(
      () => {
        logEntry('Test write succeeded', 'log', ['log', 'file']);
      },
      (e) => {
        logEntry(`Could not write/unlink test file ${e}`, 'error', ['file']);
        remote.dialog.showErrorBox(
          'Error!',
          'Could not write test file. Please run the client as administrator and/or make sure the game folder is not read-only'
        );
        remote.app.quit();
      }
    );
    createUserDirectories();
    mapSync$(DIR_QUIET_USERMAPS).subscribe(
      (syncMap) => {
        mapSyncWrite$(syncMap.response).subscribe();
        if (Object.keys(syncMap.response).length > 0) {
          logEntry(
            'You have some maps that have a newer version in the map library!',
            'log',
            ['log', 'file', 'main']
          );
        }
      },
      (e) => {
        console.error(e);
      },
      () => {
        console.log('mapSync:: Complete');
      }
    );
  }, []);

  const handleUpdate = useCallback(async () => {
    const updateLCE = () => {
      setUpdateStatus(UpdateStatus.Updating);
      checkLCEUpdate$().subscribe((n) => {
        if (n) {
          logEntry('Downloading LCE zip', 'log');
          download(n, DIR_QUIET_USERMODS_LCE_ZIP, (_, perc, done) => {
            MainLogDownloadFilePercentageStatusSubject.next(perc ?? 0);
            if (done) {
              const dirs = fs.readdirSync(DIR_QUIET_USERMODS);
              dirs.forEach((d) => {
                const isDir = fs
                  .statSync(path.join(DIR_QUIET_USERMODS, d))
                  .isDirectory();
                if (
                  (d.includes('M28AI') && isDir) ||
                  (d.includes('QUIET-Community-Edition') && isDir) ||
                  (d.includes('QUIET-Community-Edition') && isDir)
                ) {
                  try {
                    rimraf.sync(path.join(DIR_QUIET_USERMODS, d));
                    logEntry(`Succesfully removed usermod ${d}`, 'log');
                  } catch (e) {
                    logEntry(e as any, 'error');
                  }
                }
              });
              logEntry('Succesfully downloaded QCE zip', 'log');
              logEntry('Unpacking downloaded QCE zip', 'log');
              unpackZIP$(DIR_QUIET_USERMODS_LCE_ZIP, DIR_QUIET_USERMODS);
              logEntry('Succesfully unzipped QCE zip', 'log');
              fs.unlinkSync(DIR_QUIET_USERMODS_LCE_ZIP);
              logEntry('Succesfully removed QCE zip', 'log');
              setUpdateStatus(UpdateStatus.UpToDate);
              updateM28AI();
            }
          });
        } else {
          setUpdateStatus(UpdateStatus.UpToDate);
          updateM28AI();
        }
      });
    };

    const updateM28AI = () => {
      setUpdateStatus(UpdateStatus.Updating);
      checkM28Update$().subscribe((n) => {
        if (n) {
          logEntry('Downloading M28AI zip', 'log');
          download(n, DIR_QUIET_USERMODS_M28_ZIP, (_, perc, done) => {
            MainLogDownloadFilePercentageStatusSubject.next(perc ?? 0);
            if (done) {
              logEntry('Succesfully downloaded M28AI zip', 'log');
              logEntry('Unpacking downloaded M28AI zip', 'log');
              unpackZIP$(DIR_QUIET_USERMODS_M28_ZIP, DIR_QUIET_USERMODS);
              logEntry('Succesfully unzipped M28AI zip', 'log');
              logEntry('Renaming unzipped M28AI dir', 'log');
              {
                const dirs = fs.readdirSync(DIR_QUIET_USERMODS);
                dirs.forEach((d) => {
                  if (
                    d.toLowerCase().includes('m28') &&
                    fs.statSync(path.join(DIR_QUIET_USERMODS, d)).isDirectory()
                  ) {
                    try {
                      fs.renameSync(
                        path.join(DIR_QUIET_USERMODS, d),
                        path.join(DIR_QUIET_USERMODS, 'M28AI')
                      );
                    } catch (err) {
                      console.log(err);
                      logEntry(
                        `RENAME ${path.join(
                          DIR_QUIET_USERMODS,
                          d
                        )} to ${path.join(
                          DIR_QUIET_USERMODS,
                          'M28AI'
                        )} MANUALLY PLEASE`
                      );
                    }
                    logEntry('Succesfully renamed M28AI dir', 'log');
                  }
                });
              }
              fs.unlinkSync(DIR_QUIET_USERMODS_M28_ZIP);
              logEntry('Succesfully removed M28AI zip', 'log');
              setUpdateStatus(UpdateStatus.UpToDate);
            }
          });
        } else {
          setUpdateStatus(UpdateStatus.UpToDate);
        }
      });
    };

    if (
      updateStatus !== UpdateStatus.Failed &&
      updateStatus !== UpdateStatus.NotChecked &&
      updateStatus !== UpdateStatus.CleanInstall &&
      updateStatus !== UpdateStatus.UpToDate
    ) {
      return;
    }
    const beforeUpdateMapsToggled = await checkUserContent('maps', true)
      .toPromise()
      .catch(() => false);
    const beforeUpdateModsToggled = await checkUserContent('mods', true)
      .toPromise()
      .catch(() => false);

    MainLogDownloadFilePercentageStatusSubject.next(0);
    MainLogDownloadFileProgressStatusSubject.next([0, 0]);
    let fileInfos: RemoteFileInfo[] | null = null;
    setUpdateStatus(UpdateStatus.CRC);
    updaterGetCRCInfo$()
      .pipe(
        switchMap((crcInfo) => {
          const fis = updaterParseRemoteFileContent(crcInfo);
          fileInfos = fis.slice();
          try {
            fs.unlinkSync(
              path.join(
                BASE_URI,
                'QUIET',
                fileInfos.find((f) =>
                  f.path
                    .toLowerCase()
                    .includes('LoudDataPath.lua'.toLowerCase())
                )!.path
              )
            );
          } catch (e) {
            logEntry(`Could not delete bin/LoudDataPath.lua! ${e}`, 'error', [
              'log',
              'file',
            ]);
          }
          return updaterCollectOutOfSyncFiles$(fis, BASE_URI, {
            channels: ['file'],
          });
        }),
        tap((n) => {
          if (n.length === 0) {
            setUpdateStatus(UpdateStatus.UpToDate);
          } else if (n.length >= 1) {
            logEntry(`Files out of sync:\r\n${n.map((m) => `${m.path}\r\n`)}`);
            setUpdateStatus(UpdateStatus.Updating);
          }
        }),
        switchMap((outOfSyncFileInfos) =>
          iif<never, [RemoteFileInfo[], RemoteFileInfo[]]>(
            () => outOfSyncFileInfos.length === 0,
            EMPTY,
            updaterGetAndWriteRemoteFiles$(BASE_URI, outOfSyncFileInfos)
          )
        )
      )
      .subscribe(
        (n) => {
          const [success, failed] = n;
          if (failed.length) {
            logEntry(
              `Failed to download files: ${failed.map((fi) => fi.path)}`,
              'error'
            );
            setUpdateStatus(UpdateStatus.Failed);
          }
          if (success.length) {
            logEntry(
              `Succesfully downloaded/overwritten files: ${success.map(
                (fi) => `${fi.path}\r\n`
              )}`,
              'log',
              ['log', 'file']
            );
            setUpdateStatus(UpdateStatus.UpToDate);
          }
        },
        (e) => {
          logEntry(`Main:handleUpdate:: ${e}`, 'error');
          setUpdateStatus(UpdateStatus.Failed);
        },
        () => {
          if (fileInfos) {
            updaterCleanupGameData$(fileInfos).subscribe();
            updaterCleanupMaps$(fileInfos).subscribe();
            updaterCleanupMods$().subscribe();
            //   updaterCleanupUserprefs$().subscribe(
            //     () => {
            //       logEntry(
            //         'Succesfully changed the games Video Options to recommended settings'
            //       );
            //     },
            //     (e) => {
            //       logEntry(e, 'error');
            //       remote.dialog.showErrorBox(
            //         'Error!',
            //         'Could not patch Game.prefs. Make sure you create a profile first by starting vanilla Supreme Commander, than run the updater once more. If you have a profile, ignore this message and set the texture details to low in the options menu ingame'
            //       );
            //     }
            //   );
          }
          try {
            if (beforeUpdateMapsToggled) {
              toggleUserContent('maps');
            }
            if (beforeUpdateModsToggled) {
              toggleUserContent('mods');
            }
          } catch (e) {
            // @ts-ignore
            logEntry(e, 'error', ['file', 'log', 'main']);
          }
          setUpdateStatus(UpdateStatus.UpToDate);
          openTargetCheck('datapathlua').subscribe((n) => {
            changeEnabledItem('louddatapathlua', n);
          });
          openTargetCheck('quiet').subscribe((n) => {
            changeEnabledItem('run', n);
          });
          createDocumentsDirectories$().subscribe(([target, created]) => {
            if (target === 'maps') {
              changeEnabledItem('open-maps', created);
            }
            if (target === 'mods') {
              changeEnabledItem('open-mods', created);
            }

            if (target === 'replays') {
              changeEnabledItem('open-replays', created);
            }
            if (created) {
              logEntry(
                `Created ${target} folder, or it already existed`,
                'log',
                ['log', 'file']
              );
            } else {
              logEntry(
                `Could not create ${target} folder ${targetURI(target)}`,
                'error',
                ['log', 'file']
              );
            }
          });
          openTargetCheck('log').subscribe((n) => {
            changeEnabledItem('log', n);
          });
          openTargetCheck('gamelog').subscribe((n) => {
            changeEnabledItem('help-gamelog', n);
          });
          openTargetCheck('help').subscribe((n) => {
            changeEnabledItem('help-help', n);
          });
          openTargetCheck('info').subscribe((n) => {
            changeEnabledItem('help-info', n);
          });
          openTargetCheck('datapathlua').subscribe((n) => {
            changeEnabledItem('louddatapathlua', n);
          });
          openTargetCheck('quiet').subscribe((n) => {
            if (!n) {
              logEntry('QUIET is not installed. Press the update button!');
            }
            changeEnabledItem('run', n);
          });
          setTimeout(() => {
            logEntry(
              `All files up to date! Start the game with the "Run Game" button!`
            );
            updateLCE();
          }, 1500);
        }
      );
  }, [changeEnabledItem, updateStatus]);

  const handlers = {
    openMap: () => {
      handleMaps();
    },
  };

  const handleRun = () => {
    rungame();
  };

  const handleMaps = () => {
    ipcRenderer.send('open-route', 'maps', [1040, 680]);
  };

  const handlePatchNotes = () => {
    ipcRenderer.send('open-route', 'patchnotes');
  };

  const handleDonate = (url: string) => {
    // openTarget('paypal', url);
  };

  const handleDiscord = (url: string) => {
     openTarget('discord', url);
  };

  useEffect(() => {
    switch (updateStatus) {
      case UpdateStatus.CRC: {
        break;
      }
      case UpdateStatus.Updating: {
        break;
      }
      case UpdateStatus.Failed:
      case UpdateStatus.NotChecked:
      case UpdateStatus.UpToDate:
      default:
        return;
    }
  }, [updateStatus]);

  return (
    <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
      <div className={classes.background}>
        <MainUpdateDialog />
        <MainLog key="main-log" />
        <MainVersion timestamp={new Date().getTime()} />
        <MainButtons
          updateStatus={updateStatus}
          onUpdate={handleUpdate}
          onPatchNotes={handlePatchNotes}
          onMaps={handleMaps}
          onRun={handleRun}
          onDonate={handleDonate}
          onDiscord={handleDiscord}
        />
        <div className={classes.userContentWrapper}>
          <Typography
            display="inline"
            variant="body2"
            className={classes.userContentLabel}
            style={{
              color: enabledItems.includes('maps') ? 'red' : 'white',
            }}
          >{`External maps: ${
            enabledItems.includes('maps') ? 'enabled' : 'disabled'
          }`}</Typography>
          <Typography
            display="inline"
            variant="body2"
            className={classes.userContentLabel}
            style={{
              color: enabledItems.includes('mods') ? 'red' : 'white',
            }}
          >{`External mods: ${
            enabledItems.includes('mods') ? 'enabled' : 'disabled'
          }`}</Typography>
        </div>
      </div>
    </GlobalHotKeys>
  );
};

export default Main;
