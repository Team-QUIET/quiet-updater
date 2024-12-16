import {
  Button,
  Checkbox,
  darken,
  Divider,
  InputLabel,
  LinearProgress,
  makeStyles,
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
} from '@material-ui/core';
import got from 'got';
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import IO, { Socket } from 'socket.io-client';
import { apiBaseURI} from '../../api/api';
import PageHeader from '../../components/PageHeader';
import { logEntry } from '../../util/logger';
import removeMap$ from '../../util/removeMap';
import writeMap$ from '../../util/writeMap';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    alignContent: 'flex-start',
    backgroundColor: darken('#282C31', 0.35),
    overflow: 'hidden',
    padding: theme.spacing(4),
    '& > button:last-child': {
      marginTop: theme.spacing(4),
    },
  },
  imageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    '& img': {
      width: 256,
      height: 256,
    },
  },
  textfieldWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  sliderWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    color: theme.palette.text.primary,
  },
  sliderWrapperTitle: {
    width: 200,
  },
  slider: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  downloadButton: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  progress: {
    width: '100%',
    margin: theme.spacing(2),
  },
}));

const mapStyleOptions = [
  'BASIC',
  'BIG_ISLANDS',
  'CENTER_LAKE',
  'DROP_PLATEAU',
  'FLOODED',
  'LAND_BRIDGE',
  'LITTLE_MOUNTAIN',
  'MOUNTAIN_RANGE',
  'ONE_ISLAND',
  'SMALL_ISLANDS',
  'VALLEY',
];
const mapBiomeOptions = [
  'BRIMSTONE',
  'DESERT',
  'EARLYAUTUMN',
  'FRITHEN',
  'MARS',
  'MOONLIGHT',
  'PRAYER',
  'STONES',
  'SUNSET',
  'SYRTIS',
  'WINDINGRIVER',
  'WONDER',
];

const mapSymmetryOptions = [
  'POINT2',
  'POINT3',
  'POINT4',
  'POINT5',
  'POINT6',
  'POINT7',
  'POINT8',
  'POINT9',
  'POINT10',
  'POINT11',
  'POINT12',
  'POINT13',
  'POINT14',
  'POINT15',
  'POINT16',
  'XZ',
  'ZX',
  'X',
  'Z',
  'QUAD',
  'DIAG',
  'NONE',
];

const mapPropOptions = [
  'BASIC',
  'BOULDER_FIELD',
  'ENEMY_CIV',
  'HIGH_RECLAIM',
  'LARGE_BATTLE',
  'NAVY_WRECKS',
  'NEUTRAL_CIV',
  'ROCK_FIELD',
  'SMALL_BATTLE',
];

enum HostState {
  None = 'None',
  Host = 'Host',
  Player = 'Player',
}

enum MapState {
  None,
  Downloading,
  Exists,
}

const Maps: FunctionComponent<{}> = () => {
  const classes = useStyles();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [imgSrc, setImgSrc] = useState(`${apiBaseURI}/mapgen/mapgen.png`);

  const [hostState, setHostState] = useState(HostState.None);
  const [mapState, setMapState] = useState(MapState.None);
  const [progressState, setProgressState] = useState(0);

  // Form Values
  const [valNrSpawns, setValNrSpawns] = useState('2');
  const [valNrTeams, setValNrTeams] = useState('2');
  const [valMapSize, setValMapSize] = useState('20km');
  const [valSymmetryStyle, setValSymmetryStyle] = useState('RANDOM');
  const [valMapStyle, setValMapStyle] = useState('RANDOM');
  const [valBiome, setValBiome] = useState('RANDOM');
  const [valPropStyle, setValPropStyle] = useState('RANDOM');
  const [valMexes, setValMexes] = useState(Math.random());
  const [valReclaim, setValReclaim] = useState(Math.random());
  const [valMexesRandom, setValMexesRandom] = useState(false);
  const [valReclaimRandom, setValReclaimRandom] = useState(false);

  useEffect(() => {
    setSocket(IO(`ws://quiet-server.thequiteproject.org:3030`));
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('mapgen-refreshed', () => {
        setImgSrc(`${apiBaseURI}/mapgen/mapgen.png?q=${Date.now()}`);
      });
    }
    return () => {
      if (!socket) return;
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const handleDownload = useCallback(async () => {
    if (mapState === MapState.Downloading) {
      return;
    }
    removeMap$('mapgen').subscribe(async () => {
      setMapState(MapState.Downloading);
      await got
        .get(`${apiBaseURI}/mapgen/mapgen.scd`)
        .on('downloadProgress', (progress) => {
          setProgressState(progress.percent * 100);
        })
        .then((res) => {
          of(res.rawBody.buffer)
            .pipe(
              switchMap((buffer) =>
                writeMap$(Buffer.from(buffer), 'mapgen.scd')
              )
            )
            .subscribe(
              () => {
                setMapState(MapState.Exists);
              },
              (e) => {
                setProgressState(0);
                logEntry(e, 'error', ['log', 'file']);
                setMapState(MapState.None);
                return;
              }
            );
        });
    });
  }, [mapState]);

  const handleStart = useCallback(() => {
    if (!socket) return;
    setMapState(MapState.None);
    socket.emit('generatemap', {
      'spawn-count': Number.parseInt(valNrSpawns, 10),
      'num-teams': Number.parseInt(valNrTeams, 10),
      'terrain-symmetry':
        valSymmetryStyle === 'RANDOM'
          ? mapSymmetryOptions[
              Math.floor(Math.random() * mapSymmetryOptions.length)
            ]
          : valSymmetryStyle,
      'map-size': valMapSize,
      'terrain-style':
        valMapStyle === 'RANDOM'
          ? mapStyleOptions[Math.floor(Math.random() * mapStyleOptions.length)]
          : valMapStyle,
      'texture-style':
        valBiome === 'RANDOM'
          ? mapBiomeOptions[Math.floor(Math.random() * mapBiomeOptions.length)]
          : valBiome,
      'prop-style':
        valPropStyle === 'RANDOM'
          ? mapPropOptions[Math.floor(Math.random() * mapPropOptions.length)]
          : valPropStyle,
      'resource-density': valMexesRandom ? Math.random() : valMexes,
      'reclaim-density': valReclaimRandom ? Math.random() : valReclaim,
    });
  }, [
    socket,
    valBiome,
    valMapSize,
    valMapStyle,
    valMexes,
    valMexesRandom,
    valNrSpawns,
    valNrTeams,
    valPropStyle,
    valReclaim,
    valReclaimRandom,
    valSymmetryStyle,
  ]);

  return (
    <>
      <PageHeader title="Generate map">
        <Divider orientation="vertical" variant="middle" />
        <Typography style={{ color: 'white' }}>
          Powered by Neroxis random map generator
        </Typography>
      </PageHeader>
      <div className={classes.root}>
        {hostState !== HostState.None ? (
          <>
            <div className={classes.imageWrapper}>
              <img src={imgSrc} alt="mapgen preview" />

              <LinearProgress
                variant="determinate"
                value={progressState}
                color="primary"
                className={classes.progress}
              />
              <Button
                variant="contained"
                className={classes.downloadButton}
                onClick={handleDownload}
              >
                {mapState === MapState.Exists ? 'Installed' : 'Download'}
              </Button>
            </div>
          </>
        ) : (
          <></>
        )}
        {hostState === HostState.None ? (
          <>
            <Button
              onClick={() => {
                setHostState(HostState.Player);
              }}
            >
              I am player
            </Button>
            <Button
              onClick={() => {
                setHostState(HostState.Host);
              }}
            >
              I am host
            </Button>
          </>
        ) : (
          <></>
        )}
        {hostState === HostState.Host ? (
          <div aria-label="hostState">
            <div className={classes.textfieldWrapper}>
              <TextField
                className={classes.input}
                label="Nr of spawns"
                value={valNrSpawns}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setValNrSpawns(e.target.value);
                }}
              />
              <TextField
                className={classes.input}
                label="Nr of teams"
                value={valNrTeams}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setValNrTeams(e.target.value);
                }}
              />
              <TextField
                className={classes.input}
                label="Map size (0-20)"
                disabled
                value={valMapSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setValMapSize(e.target.value);
                }}
              />
            </div>

            <div className={classes.input}>
              <InputLabel id="lblSymmetry">Symmetry</InputLabel>
              <Select
                labelId="lblSymmetry"
                id="selectSymmetry"
                value={valSymmetryStyle}
                onChange={(e) => {
                  // @ts-ignore
                  setValSymmetryStyle(e.target.value);
                }}
              >
                <MenuItem value="RANDOM">RANDOM</MenuItem>
                {mapSymmetryOptions.map((e) => (
                  <MenuItem value={e}>{e}</MenuItem>
                ))}
              </Select>
            </div>

            <div className={classes.input}>
              <InputLabel id="lblMapStyle">Map style</InputLabel>
              <Select
                labelId="lblMapStyle"
                id="selectMapStyle"
                value={valMapStyle}
                onChange={(e) => {
                  // @ts-ignore
                  setValMapStyle(e.target.value);
                }}
              >
                <MenuItem value="RANDOM">RANDOM</MenuItem>
                <MenuItem value="BASIC">Basic</MenuItem>
                <MenuItem value="BIG_ISLANDS">Big Islands</MenuItem>
                <MenuItem value="CENTER_LAKE">Center Lake</MenuItem>
                <MenuItem value="DROP_PLATEAU">Drop Plateau</MenuItem>
                <MenuItem value="FLOODED">Flooded</MenuItem>
                <MenuItem value="LAND_BRIDGE">Land Bridge</MenuItem>
                <MenuItem value="LITTLE_MOUNTAIN">Little Mountain</MenuItem>
                <MenuItem value="MOUNTAIN_RANGE">Mountain Range</MenuItem>
                <MenuItem value="ONE_ISLAND">One Island</MenuItem>
                <MenuItem value="SMALL_ISLANDS">Small Islands</MenuItem>
                <MenuItem value="VALLEY">Valley</MenuItem>
              </Select>
            </div>
            <div className={classes.input}>
              <InputLabel id="lblBiome">Biome</InputLabel>
              <Select
                labelId="lblBiome"
                id="selectBiome"
                value={valBiome}
                onChange={(e) => {
                  // @ts-ignore
                  setValBiome(e.target.value);
                }}
              >
                <MenuItem value="RANDOM">RANDOM</MenuItem>
                <MenuItem value="BRIMSTONE">Brimstone</MenuItem>
                <MenuItem value="DESERT">Desert</MenuItem>
                <MenuItem value="EARLYAUTUMN">Earlyautumn</MenuItem>
                <MenuItem value="FRITHEN">Frithen</MenuItem>
                <MenuItem value="MARS">Mars</MenuItem>
                <MenuItem value="MOONLIGHT">Moonlight</MenuItem>
                <MenuItem value="PRAYER">Prayer</MenuItem>
                <MenuItem value="STONES">Stones</MenuItem>
                <MenuItem value="SUNSET">Sunset</MenuItem>
                <MenuItem value="SYRTIS">Syrtis</MenuItem>
                <MenuItem value="WINDINGRIVER">Windingriver</MenuItem>
                <MenuItem value="WONDER">Wonder</MenuItem>
              </Select>
            </div>

            <div className={classes.input}>
              <InputLabel id="lblPropStyle">Prop Style</InputLabel>
              <Select
                labelId="lblPropStyle"
                id="selectPropStyle"
                value={valPropStyle}
                onChange={(e) => {
                  // @ts-ignore
                  setValPropStyle(e.target.value);
                }}
              >
                <MenuItem value="RANDOM">RANDOM</MenuItem>
                {mapPropOptions.map((e) => (
                  <MenuItem value={e}>{e}</MenuItem>
                ))}
              </Select>
            </div>

            <div className={classes.sliderWrapper}>
              <div className={classes.sliderWrapperTitle}>
                <Typography>mexes</Typography>
              </div>
              <Typography>Random</Typography>
              <Checkbox
                value={valMexesRandom}
                onChange={(e) => {
                  setValMexesRandom(e.target.checked);
                }}
              />
              <Typography>0</Typography>
              <Slider
                className={classes.slider}
                min={0}
                max={1}
                step={0.01}
                value={valMexes}
                disabled={valMexesRandom}
                onChange={(_, value) =>
                  setValMexes(Array.isArray(value) ? value[0] : value)
                }
              />
              <Typography>1</Typography>
            </div>
            <div className={classes.sliderWrapper}>
              <div className={classes.sliderWrapperTitle}>
                <Typography>reclaim</Typography>
              </div>
              <Typography>Random</Typography>
              <Checkbox
                value={valReclaimRandom}
                onChange={(e) => {
                  setValReclaimRandom(e.target.checked);
                }}
              />
              <Typography>0</Typography>
              <Slider
                className={classes.slider}
                min={0}
                max={1}
                step={0.01}
                disabled={valReclaimRandom}
                value={valReclaim}
                onChange={(_, value) =>
                  setValReclaim(Array.isArray(value) ? value[0] : value)
                }
              />
              <Typography>1</Typography>
            </div>
            <Typography style={{ color: 'white' }}>
              If you see a broken image OR if you didn't get a response within
              10 seconds, press the generate button again. This means the
              SYMMERTY option was incompatible with the amount of user spawn and
              or teams
            </Typography>
            <Button variant="contained" onClick={handleStart}>
              Generate
            </Button>
          </div>
        ) : (
          <></>
        )}
      </div>
    </>
  );
};

export default Maps;
