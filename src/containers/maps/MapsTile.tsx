import React, { FunctionComponent, useState } from 'react';
import { MapAttr } from './types';
import {
  Grid,
  Card,
  CardMedia,
  makeStyles,
  Typography,
  Paper,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import PlayersIcon from '@material-ui/icons/Group';
import SizeIcon from '@material-ui/icons/AspectRatio';
import DownloadIcon from '@material-ui/icons/GetAppRounded';
import { mapSizeToString } from './utils';
import clsx from 'clsx';
import { apiBaseURI, apiBaseURIQuiet } from '../../api/api';

const useStyles = makeStyles((theme) => ({
  grid: {
    padding: theme.spacing(0.5),
    minWidth: 180,
    maxWidth: 240,
  },
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    cursor: 'pointer',
  },
  media: {
    flexShrink: 0,
    width: '100%',
    paddingTop: '100%',
  },
  titleBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    background: 'rgba(0,0,0,0.7)',
    right: 0,
    width: '100%',
    padding: theme.spacing(1),
    maxHeight: 88,
  },
  infoBox: {
    color: 'rgba(0, 0, 0, 0.87)',
    position: 'absolute',
    backgroundColor: theme.palette.secondary.main,
    transition: '0.1s all ease-in-out',
    padding: theme.spacing(0.125, 0.5),
    display: 'flex',
    alignItems: 'center',
  },
  infoBoxIcon: {
    transition: '0.1s all ease-in-out',
    '&': { width: 0 },
    marginRight: theme.spacing(0),
  },
  sizeBox: {
    top: theme.spacing(4),
    left: theme.spacing(0.5),
  },
  sizeBoxHover: {
    transformOrigin: 'top left',
  },
  sizeBoxIconHover: {
    '&': { width: 24 },
    marginRight: theme.spacing(0.5),
  },
  playersBox: {
    top: theme.spacing(0.5),
    left: theme.spacing(0.5),
  },
  playersBoxHover: {
    transformOrigin: 'top left',
  },
  playersBoxIconHover: {
    '&': { width: 24 },
    marginRight: theme.spacing(0.5),
  },
  downloadsBox: {
    top: theme.spacing(7.5),
    left: theme.spacing(0.5),
  },
  boxTextColor: {
    color: 'rgba(0, 0, 0, 0.87)',
  },
  outdatedAlert: {
    position: 'absolute',
    top: -theme.spacing(8),
    left: theme.spacing(1),
    right: theme.spacing(1),
    padding: theme.spacing(0.25, 1),
  },
}));

interface Props extends MapAttr {
  onClick: () => void;
  outdated: boolean;
}

const MapsTile: FunctionComponent<Props> = ({
  downloads,
  image,
  name,
  onClick,
  size,
  version,
  players,
  outdated,
  quiet,
}) => {
  const classes = useStyles();
  const [focussed, setFocussed] = useState(false);
  return (
    <Grid
      item
      xs={6}
      sm={3}
      md={3}
      lg={2}
      xl={2}
      className={classes.grid}
      onMouseEnter={() => {
        setFocussed(true);
      }}
      onMouseLeave={() => {
        setFocussed(false);
      }}
    >
      <Card square elevation={0} className={classes.root} onClick={onClick}>
        <CardMedia
          image={
            !quiet ? `${apiBaseURI}/${image}` : `${apiBaseURIQuiet}/${image}`
          }
          className={classes.media}
        />

        <div className={classes.titleBox}>
          {outdated && (
            <Alert className={classes.outdatedAlert} severity="warning">
              New version available!
            </Alert>
          )}
          <Typography
            style={{ fontWeight: 'bold', color: 'white' }}
            variant="body2"
          >
            {`${name} (${version})`}
          </Typography>
        </div>
        <Paper
          className={clsx([
            classes.infoBox,
            classes.playersBox,
            focussed && classes.playersBoxHover,
          ])}
        >
          <PlayersIcon
            className={clsx([
              classes.infoBoxIcon,
              focussed && classes.playersBoxIconHover,
            ])}
            fontSize="small"
          />
          <Typography
            variant="caption"
            className={classes.boxTextColor}
            style={{ fontWeight: 'bold' }}
          >
            {players} Players
          </Typography>
        </Paper>
        <Paper
          className={clsx([
            classes.infoBox,
            classes.sizeBox,
            focussed && classes.sizeBoxHover,
          ])}
        >
          <SizeIcon
            className={clsx([
              classes.infoBoxIcon,
              focussed && classes.sizeBoxIconHover,
            ])}
            fontSize="small"
          />
          <Typography
            variant="caption"
            className={classes.boxTextColor}
            style={{ fontWeight: 'bold' }}
          >
            {mapSizeToString(size, !focussed)}km
          </Typography>
        </Paper>
        <Paper
          className={clsx([
            classes.infoBox,
            classes.downloadsBox,
            focussed && classes.sizeBoxHover,
          ])}
        >
          <DownloadIcon
            className={clsx([
              classes.infoBoxIcon,
              focussed && classes.sizeBoxIconHover,
            ])}
            fontSize="small"
          />
          <Typography
            variant="caption"
            className={classes.boxTextColor}
            style={{ fontWeight: 'bold' }}
          >
            {downloads}
          </Typography>
        </Paper>
      </Card>
    </Grid>
  );
};

export default MapsTile;
