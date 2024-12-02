import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { BASE_URI } from '../constants';
import { logEntry } from './logger';
import { from } from 'rxjs';

const BAT_NAME = 'QUIET_Updater.bat';

const template = () => `
REM @ECHO OFF
${BASE_URI[0]}: 
cd "${BASE_URI}"

TASKKILL /F /IM "QUIET_Updater.exe"

RENAME ".\\QUIET_Updater.exe" "QUIET_Updater_BACKUP"
RENAME ".\\QUIET_Updater_UPDATE" "QUIET_Updater.exe"

START "" ".\\QUIET_Updater.exe"

DEL /F ".\\QUIET_Updater_BACKUP"
EXIT
`;

const writeUpdater = () =>
  from(
    new Promise<any>((res) => {
      try {
        fs.unlinkSync(path.join(BASE_URI, BAT_NAME));
      } catch (e) {
        logEntry(`${e}`, 'error', ['log']);
      }
      fs.writeFileSync(path.join(BASE_URI, BAT_NAME), template());
      res(undefined);
    })
  );

const executeUpdate = () => {
  exec(`start cmd.exe /c "${path.join(BASE_URI, BAT_NAME)}"`, (e) => {
    if (e) {
      logEntry(`${e}`, 'error', ['file', 'log', 'main']);
    }
  });
};

const updateRestart = () => {
  writeUpdater().subscribe(
    () => {
      executeUpdate();
    },
    (e) => {
      logEntry(`${e}`, 'error', ['log']);
    }
  );
  // } else {
  //   logEntry(`Writing auto-update failed: ${buffer}`, 'error', [
  //     'file',
  //     'log',
  //     'main',
  //   ]);
  //   logEntry(
    //     'Could not auto-update. Please post the QUIET_Updater.log.txt in Discords #bug-report channel.'
  //   );
  //   throw new Error();
  // }
};

export const updateRestartCleanup = () => {
  try {
    fs.stat(path.join(BASE_URI, BAT_NAME), (err, stats) => {
      if (err) {
        return;
      }
      fs.unlinkSync(path.join(BASE_URI, BAT_NAME));
    });
  } catch (e) {
    logEntry(e, 'error', ['file']);
  }
};

export default updateRestart;
