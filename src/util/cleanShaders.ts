//@ts-nocheck
import fs from 'fs'
import { APPDATA_CACHE, SETTINGS_CACHE, CURRENT_SHADER_VERSION } from '../constants';
import { logEntry } from './logger';
import { env } from 'process';
import path from 'path';

function shaderFiles(parent, force){
    if (fs.existsSync(parent))
    {return  fs.readdirSync(parent)
        .filter((filename)=> (force || ! filename.includes(CURRENT_SHADER_VERSION)))
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
//as a work-around, we're just going to force clearing the cache
//by default.  we were trying to avoid doing this if the shaders
//looked correct by version, but we're getting issues now.
//so every time we update, we'll clear the shader cache.  This should
//be a really minor inconvenience, probably not noticable at all.
//It should also correct shader crashes entirely going forward, particularly
//for new users.
const cleanShaders = (force) => {
    try{logEntry("ExpectedSCFA Shader Cache Paths are: \n" + APPDATA_CACHE + " \n and/or "  +
                 SETTINGS_CACHE + "\n");
        cleared = false;
        //ignore force ui boolean toggle, just pass true so we clear all files.
        let targets = shaderFiles(APPDATA_CACHE, true).concat(shaderFiles(SETTINGS_CACHE,force));
        targets.forEach(removeShader);
        if (cleared){logEntry("Shader cache is cleared; they will automatically recompile on next SCFA launch.");}
        else {logEntry("Shader cache is clear or already consistent with " + CURRENT_MESH_VERSION)}
       }catch (err){
           logEntry("Unable to clear shader cache, you might have to manually do it. \n https://github.com/Team-QUIET/QUIET-Community-Edition?tab=readme-ov-file#old-cached-shaders");
       }};

export default cleanShaders;
