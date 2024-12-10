import CreateDesktopShortcuts from './CreateDesktopShortcuts';
import fs from 'fs';
import { BASE_URI, FILE_URI_ICON, FILE_URI_SHORTCUT } from '../constants';
import { logEntry } from './logger';

const create = (exePath: string) => {
  CreateDesktopShortcuts({
    windows: {
      filePath: `${BASE_URI}/QUIET_Updater.exe`,
      name: 'QUIET Updater',
      description: 'QUIET Project Updater',
      icon: FILE_URI_ICON,
    },
  });
  CreateDesktopShortcuts({
    windows: {
      filePath: exePath,
      name: 'QUIET Forged Alliance',
      description: 'QUIET Forged Alliance',
      icon: FILE_URI_ICON,
      arguments: `/log '..\\QUIET\\bin\\Loud.log' /init '..\\QUIET\\bin\\LoudDataPath.lua'`,
    },
  });
};

const createShortcuts = () => {
  fs.stat(FILE_URI_SHORTCUT, (errVBS) => {
    if (errVBS) {
      logEntry(
        'Could not find shortcut.vbs. Make sure to run the update button first!',
        'error',
        ['file', 'log', 'main']
      );
      return;
    }
    fs.stat(`${BASE_URI}/bin/ForgedAlliance.exe`, (errFA) => {
      if (errFA) {
        fs.stat(`${BASE_URI}/bin/SupremeCommander.exe`, (errSC) => {
          if (errSC) {
            logEntry(
              `Could not find FA/SC .exe ${BASE_URI}/bin/SupremeCommander.exe`,
              'error'
            );
          }
          create(`${BASE_URI}/bin/SupremeCommander.exe`);
        });
        return;
      }
      create(`${BASE_URI}/bin/ForgedAlliance.exe`);
    });
  });
};

export default createShortcuts;
//
