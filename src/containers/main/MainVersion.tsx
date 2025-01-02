import { makeStyles, Typography } from '@material-ui/core';
import React, { FunctionComponent, useEffect } from 'react';
import checkModVersion, { CheckModVersion } from '../../util/checkModVersion';

const useStyles = makeStyles((theme) => ({
  buttonWrapper: {
    display: 'flex',
    backgroundColor: 'transparent',
    width: '100%',
    justifyContent: 'left',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    margin: theme.spacing(0, 2, 0, 2),
  },
  versionIndicator: {
    height: 15,
    fontWeight: 'bold',
    fontSize: '12px',
    color: 'black',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#b345ff', //'#FBFF3A',
    borderRadius: 4,
    padding: 4,
    margin: theme.spacing(0, 1, 0, 1),
  },
}));

interface Props {
  timestamp: number;
}

const MainVersion: FunctionComponent<Props> = ({ timestamp }) => {
  const classes = useStyles();

  useEffect(() => {
    //
  }, [timestamp]);

  return (
    <>
      <div className={classes.buttonWrapper}>
        <Typography className={classes.versionIndicator}>
          QUIET: {checkModVersion(CheckModVersion.QUIET)}
        </Typography>
        <Typography className={classes.versionIndicator}>
          LCE: {checkModVersion(CheckModVersion.LCE)}
        </Typography>
        <Typography className={classes.versionIndicator}>
          M28: {checkModVersion(CheckModVersion.M28)}
        </Typography>
      </div>
    </>
  );
};

export default React.memo(MainVersion);
