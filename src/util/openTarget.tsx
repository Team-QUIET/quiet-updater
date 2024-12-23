import fs from 'fs';
import { spawn, exec } from 'child_process';
import {
  DIR_QUIET_GAMEDATA,
  DOC_DIR_SUPCOM_REPLAYS,
  FILE_URI_LOG,
  FILE_URI_INFO,
  FILE_URI_GAMELOG,
  FILE_URI_HELP,
  FILE_URI_QUIETDATAPATHLUA,
  FILE_URI_ICONMOD,
  FILE_URI_SHORTCUT,
  DIR_QUIET_USERMODS,
  DIR_QUIET_USERMAPS,
  FILE_URI_LOG_FOLDER,
  FILE_URI_GAMELOG_FOLDER,
} from '../constants';
import { from } from 'rxjs';
import { logEntry } from './logger';
import { shell } from 'electron';

export type Target =
  | 'datapathlua'
  | 'maps'
  | 'mods'
  | 'replays'
  | 'log'
  | 'logFolder'
  | 'gamelog'
  | 'gamelogFolder'
  | 'help'
  | 'info'
  | 'quiet'
  | 'paypal'
  | 'patreon'
  | 'discord'
  | 'iconmod'
  | 'onedrive'
  | 'shortcut'
  | 'url';

const targetPath = (target: Target) => {
  switch (target) {
    case 'maps':
      return `C:/Windows/explorer.exe`;
    case 'mods':
      return `C:/Windows/explorer.exe`;
    case 'replays':
      return `C:/Windows/explorer.exe`;
    case 'logFolder':
      return `C:/Windows/explorer.exe`;
    case 'gamelogFolder':
      return `C:/Windows/explorer.exe`;
    case 'log':
      return `notepad.exe`;
    case 'gamelog':
      return `notepad.exe`;
    case 'help':
      return `notepad.exe`;
    case 'info':
      return `notepad.exe`;
    case 'iconmod':
    default:
      throw new Error('invalid target');
  }
};

export const targetURI = (target: Target) => {
  switch (target) {
    case 'datapathlua':
      return FILE_URI_QUIETDATAPATHLUA;
    case 'maps':
      return DIR_QUIET_USERMAPS.replace(/\//g, '\\');
    case 'mods':
      return DIR_QUIET_USERMODS.replace(/\//g, '\\');
    case 'replays':
      return DOC_DIR_SUPCOM_REPLAYS;
    case 'log':
      return FILE_URI_LOG;
    case 'logFolder':
      return FILE_URI_LOG_FOLDER;
    case 'gamelog':
      return FILE_URI_GAMELOG;
    case 'gamelogFolder':
      return FILE_URI_GAMELOG_FOLDER;
    case 'help':
      return FILE_URI_HELP;
    case 'info':
      return FILE_URI_INFO;
    case 'quiet':
      return DIR_QUIET_GAMEDATA;
    case 'iconmod':
      return FILE_URI_ICONMOD;
    case 'shortcut':
      return FILE_URI_SHORTCUT;
    default:
      throw new Error('invalid target');
  }
};

export const openTargetCheck = (target: Target) =>
  from(
    new Promise<boolean>((res) => {
      fs.stat(targetURI(target), (err) => {
        if (err) {
          res(false);
          return;
        }
        res(true);
      });
    })
  );

const openTarget = (target: Target, extra?: string) => {
  if (target === 'iconmod') {
    exec(`"${FILE_URI_ICONMOD}"`, (err) => {
      if (err) {
        logEntry(`${err}`, 'error');
      }
    });
  } else if (target === 'url' && typeof extra === 'string') {
    shell.openPath(extra);
  } else if (target === 'onedrive') {
    shell.openPath(`https://1drv.ms/u/s!AubmcwAIEAlzn2TwHzibrMTRySVj?e=MCevjP`);
  } else if (target === 'patreon') {
    shell.openPath('https://www.patreon.com/user?u=37869110');
  } else if (target === 'paypal' && extra) {
    shell.openPath(extra);
  } else if (target === 'discord' && extra) {
    shell.openPath(extra);
  } else {
    let path = targetPath(target);
    let targetArgs: string[] = [targetURI(target)];
    if (!targetPath.length) {
      return;
    } else {
      spawn(path, targetArgs);
    }
  }
};

export default openTarget;
