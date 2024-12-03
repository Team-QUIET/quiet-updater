import fs from 'fs';
import path from 'path';
import { DIR_QUIET_GAMEDATA, DIR_QUIET_USERMODS } from '../constants';
// @ts-ignore
import ZIP from 'adm-zip';

const regexModInfo = /version\s*=\s*"?(.*)"?/i;

export enum CheckModVersion {
  QUIET,
  LCE,
  M28,
}

function checkModVersion(mod: CheckModVersion) {
  let _path = null;
  switch (mod) {
    case CheckModVersion.QUIET:
      _path = `${DIR_QUIET_GAMEDATA}/lua/ai/CustomAIs_v2/ExtrasAI.lua`;
      break;
    case CheckModVersion.LCE:
      _path = `${DIR_QUIET_USERMODS}/QUIET-Community-Edition/mod_info.lua`;
      break;
    case CheckModVersion.M28:
      _path = `${DIR_QUIET_USERMODS}/M28AI/mod_info.lua`;
      break;
    default:
      break;
  }
  if (_path === null) {
    throw Error('No path selected');
  }
  if (mod === CheckModVersion.QUIET) {
    try {
      const scdPath = path.join(DIR_QUIET_GAMEDATA, 'lua.scd');
      fs.statSync(scdPath);
      let archive = new ZIP(scdPath);
      const versionJSON: string = archive.readAsText(
        'lua/AI/CustomAIs_v2/ExtrasAI.lua'
      );
      const versionArr = versionJSON.match('"([0-9.]*)"');
      return versionArr?.[1] ?? null;
    } catch (err) {
      return null;
    }
  } else {
    try {
      fs.statSync(_path);
      const fileContents = fs.readFileSync(_path).toString();
      const version = fileContents.match(regexModInfo);
      return version?.[1] ?? null;
    } catch (err) {
      return null;
    }
  }
}

export default checkModVersion;
