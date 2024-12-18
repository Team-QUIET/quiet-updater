//@ts-nocheck
import fs from 'fs'
import { APPDATA_CACHE, SETTINGS_CACHE, CURRENT_MESH_VERSION } from '../constants';
import { logEntry } from './logger';
import { env } from 'process';
import path from 'path';

function meshFiles(parent, force){
    if (fs.existsSync(parent))
    {return  fs.readdirSync(parent)
        .filter((filename)=> (filename.includes('mesh')) && (force || (filename != CURRENT_MESH_VERSION)))
        .map((filename)=> path.resolve(parent, filename));}
    else {return []};
}

let cleared = false
function removeShader(filepath){
    if (fs.existsSync(filepath)){
        logEntry("targeting " + filepath  + " for removal");
        try {fs.unlinkSync(filepath);
             logEntry(filepath + " cleared successfully.");
             cleared = true;
            } catch (err) {
                logEntry("failed to clear shader at " + filepath);
            }}}

const cleanShaders = (force) => {
    try{logEntry("ExpectedSCFA Shader Cache Paths are: \n" + APPDATA_CACHE + " \n and/or "  +
                 SETTINGS_CACHE + "\n");
        cleared = false;
        let targets = meshFiles(APPDATA_CACHE, force).concat(meshFiles(SETTINGS_CACHE,force));
        targets.forEach(removeShader);
        if (cleared){logEntry("Shader cache is cleared; they will automatically recompile on next SCFA launch.");}
        else {logEntry("Shader cache is clear or already consistent with " + CURRENT_MESH_VERSION)}
       }catch (err){
           logEntry("Unable to clear shader cache, you might have to manually do it. \n https://github.com/Team-QUIET/QUIET-Community-Edition?tab=readme-ov-file#old-cached-shaders");
       }};

export default cleanShaders;
