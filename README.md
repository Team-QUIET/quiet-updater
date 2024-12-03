# QUIET Client

![Client](client.PNG?raw=true)

## General

Welcome to the repository of the QUIET Client, which is the shiny new client for the [QUIET Project mod](https://github.com/Team-QUIET/QUIET-Community-Edition).

Still not sure what the QUIET Project is? Find out [here](https://github.com/Team-QUIET/QUIET-Community-Edition)

In the releases tab you can find the latest public release of the client.

## Table Of Contents

1. [Installation](#installation)
2. [Features](#features)

## Installation

1. Navigate to the latest releases in the [releases tab](https://github.com/Team-QUIET/quiet-updater/releases);
2. Download either the .exe file or the .deb file, depending on your platform;
3. Place the **QUIET_Updater.exe** into the root of the Supreme Commander: Forged Alliance folder \*(i.e. C:\SteamLibrary\steamapps\common\Supreme Commander Forged Alliance)\_
4. Make sure you have started Supreme Commander at least once in order to create a profile;
5. Start **QUIET_Updater.exe** and press the update button; (this can take up to 45 minutes on the first run, it needs to pull in a lot of (big) files);
6. Once the indicator under the Update button becomes green and says "Up to date" you are ready to run the QUIET Project mod using the run game button!

## Features

These are the primary features of the client:

- Using the update button, you can update your local mod installation with the latest version
- Using the run button button, you can run Supreme Commander with the QUIET Project Mod active
- Several buttons to locate all the logging that goes on (useful for bug reports)
- Toggle options for loading in Maps/Mods from the C:\Users\%username%\My Games\Gas Powered Games\Maps / Mods folders (do not put any additional content in the QUIET folder, it will be removed!)
- A handy auto updater
- A map library where you can download QUIET approved maps

## Contributing

If you want to contribute to this Client or the Mod itself, feel free to post a message in our Discord.


## Development
- clone this repository
- ensure you have npm and yarn installed
- create a file ./.env.development in the repo folder where REACT_APP_FS_BASE_URL is 
  set to your root SCFA installation path:

```shell
REACT_APP_FS_BASE_URL=C:\Program Files (x86)\Steam\steamapps\common\Supreme Commander Forged Alliance
REACT_APP_LOG_CONFIG_CHANNELS=log,main,file
```

- yarn dev

```
requirements: node, yarn, npm install eslint@^7.0.2 -g
development: yarn && yarn dev
```
