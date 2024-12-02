import React, { useEffect, useState } from 'react';
import {
  Dialog,
  Typography,
  LinearProgress,
  makeStyles,
} from '@material-ui/core';
import checkClientUpdate$ from '../../util/checkClientUpdate';
import { logEntry } from '../../util/logger';
import updateRestart, { updateRestartCleanup } from '../../util/updateRestart';
import download from '../../util/download.util';
import { BASE_URI } from '../../constants';

const useStyles = makeStyles((theme) => ({
  root: {
    background: 'transparent',
  },
  paper: {
    background: 'transparent',
    borderRadius: 0,
  },
  bar: {
    marginTop: theme.spacing(1),
    borderRadius: 99,
  },
}));

interface Props {
  url: string;
}

const MainUpdateDialog = () => {
  const classes = useStyles();
  const [updateURL, setUpdateURL] = useState<string | null>(null);
  const [waitRestart, setWaitRestart] = useState(false);
  useEffect(() => {
    checkClientUpdate$().subscribe(
      (n) => {
        if (n) {
          setUpdateURL(n);
        }
      },
      () => {
        updateRestartCleanup();
      }
    );
  }, []);
  useEffect(() => {
    const verbose = true;
    if (updateURL) {
      logEntry(updateURL, 'warn', ['log']);
      download(
        updateURL,
        `${BASE_URI}/QUIET_Updater_UPDATE`,
        (_, perc, done) => {
          if (verbose)
            logEntry(
              `${BASE_URI}/QUIET_Updater_UPDATE: ${perc}/100 ${BASE_URI}`,
              'log',
              ['log', 'main']
            );
          if (done) {
            setWaitRestart(true);
            setTimeout(() => {
              setWaitRestart(false);
              setUpdateURL(null);
              updateRestart();
            }, 1000);
          }
        }
      );
    }

  }, [updateURL]);
  return (
    <Dialog
      classes={{ root: classes.root, paper: classes.paper }}
      open={!!updateURL}
    >
      <Typography>
        {!waitRestart
          ? `Updating to latest version, this may take a few minutes`
          : 'Restarting...'}
      </Typography>
      <LinearProgress className={classes.bar} color="secondary" />
    </Dialog>
  );
};

export default MainUpdateDialog;
