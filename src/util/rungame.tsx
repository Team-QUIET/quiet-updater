import fs from 'fs';
import { exec } from 'child_process';
import { BASE_URI } from '../constants';
import { logEntry } from './logger';

const rungame = () => {
  const BASE_URI_WIN = BASE_URI.replace(/\//g, '\\');
  fs.stat(`${BASE_URI}/bin/ForgedAlliance.exe`, (errFA) => {
    if (errFA) {
      fs.stat(`${BASE_URI}/bin/SupremeCommander.exe`, (errSC) => {
        if (errSC) {
          logEntry(
            `Could not find FA/SC .exe ${BASE_URI}/bin/SupremeCommander.exe`,
            'error'
          );
        }
        exec(
          `"${BASE_URI}/bin/SupremeCommander.exe" /log "${BASE_URI_WIN}\\QUIET\\bin\\QUIET.log" /init "${BASE_URI_WIN}\\QUIET\\bin\\LoudDataPath.lua"`
        );
      });
      return;
    }
    exec(
      `"${BASE_URI}/bin/ForgedAlliance.exe" /log "${BASE_URI_WIN}\\QUIET\\bin\\QUIET.log" /init "${BASE_URI_WIN}\\QUIET\\bin\\LoudDataPath.lua"`
    );
  });
};

export default rungame;
