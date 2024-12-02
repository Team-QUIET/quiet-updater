import fs from 'fs';
import path from 'path';
import { DIR_LOUD_GAMEDATA, DIR_LOUD_USERMODS } from '../constants';
// @ts-ignore
import ZIP from 'adm-zip';

const regexModInfo = /version\s*=\s*"?(.*)"?/i;

export enum CheckModVersion {
  LOUD,
  LCE,
  M28,
}

function checkModVersion(mod: CheckModVersion) {
  let _path = null;
  switch (mod) {
    case CheckModVersion.LOUD:
      _path = `${DIR_LOUD_GAMEDATA}/lua/ai/CustomAIs_v2/ExtrasAI.lua`;
      break;
    case CheckModVersion.LCE:
      _path = `${DIR_LOUD_USERMODS}/QUIET-Community-Edition/mod_info.lua`;
      break;
    case CheckModVersion.M28:
      _path = `${DIR_LOUD_USERMODS}/M28AI/mod_info.lua`;
      break;
    default:
      break;
  }
  if (_path === null) {
    throw Error('No path selected');
  }
  if (mod === CheckModVersion.LOUD) {
    try {
      const scdPath = path.join(DIR_LOUD_GAMEDATA, 'lua.scd');
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
