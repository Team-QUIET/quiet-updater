import React, { useState, useEffect } from 'react';
import Page from '../../components/Page';
import {
  Button,
  Typography,
  Divider,
  makeStyles,
  colors,
  darken,
} from '@material-ui/core';
import fetchPatchNotes$, { PatchNotesURL } from '../../util/fetchPatchNotes';
import { PatchNote } from '../../util/types';
import PageHeader from '../../components/PageHeader';
import Loading from '../../components/Loading';
import { delay } from 'rxjs/operators';

const useStyles = makeStyles((theme) => ({
  page: {
    flexDirection: 'column',
    color: colors.grey[100],
    overflow: 'hidden',
  },
  headerDivider: {
    margin: theme.spacing(0, 0.5, 0.5, 2),
    height: 47 - theme.spacing(0.5),
  },
  headerButton: {
    margin: theme.spacing(0, 0.5),
  },
  content: {
    display: 'flex',
    flex: '1 1 100%',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: theme.spacing(2),
    backgroundColor: darken('#282C31', 0.35),
  },
  note: {
    padding: theme.spacing(1, 0),
  },
  noteHeader: {
    display: 'flex',
    flex: '0 0 100%',
    flexWrap: 'wrap',
    '& > *:first-child': {
      lineHeight: 0.8,
      width: '100%',
    },
    '& > *:last-child': {
      marginBottom: theme.spacing(1),
    },
  },
  noteBold: {
    fontWeight: 'bold',
  },
  noteBody: {
    whiteSpace: 'pre-line',
  },
  button: {
    margin: theme.spacing(1),
    alignSelf: 'center',
  },
  footer: {
    marginBottom: theme.spacing(1),
  },
  empty: {
    display: 'flex',
    flex: '1 1 100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
}));

const PatchNotes = () => {
  const classes = useStyles();
  const [retryTimestamp, setRetryTimestamp] = useState(0);
  const [viewIdx, setViewIdx] = useState<0 | 1>(0);
  const [patchNotes, setPatchNotes] = useState<PatchNote[] | null | undefined>(
    undefined
  );
  const [patchNotesQUIET, setPatchNotesQUIET] = useState<
    PatchNote[] | null | undefined
  >(undefined);

  useEffect(() => {
    const subscription = fetchPatchNotes$(PatchNotesURL.Client)
      .pipe(delay(1200))
      .subscribe(setPatchNotes, (e) => {
        console.error(e);
        setPatchNotes(null);
      });
    const subscriptionQUIET = fetchPatchNotes$(PatchNotesURL.QUIET)
      .pipe(delay(1200))
      .subscribe(setPatchNotesQUIET, (e) => {
        console.error(e);
        setPatchNotesQUIET(null);
      });
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (subscriptionQUIET) {
        subscriptionQUIET.unsubscribe();
      }
    };
  }, [retryTimestamp]);

  const Empty = (
    <div className={classes.empty}>
      <img src={require('../../assets/quietLogo128.png')} alt="logo" />
      <Typography variant="body1">
        Something went wrong, please try again!
      </Typography>
      <Button
        onClick={() => {
          setPatchNotesQUIET(undefined);
          setPatchNotes(undefined);
          setRetryTimestamp(Date.now().valueOf());
        }}
      >
        Click me!
      </Button>
    </div>
  );

  return (
    <Page className={classes.page}>
      <PageHeader title="Patch Notes">
        <Divider
          className={classes.headerDivider}
          orientation="vertical"
          variant="middle"
        />
        <Button
          className={classes.headerButton}
          onClick={() => {
            setViewIdx(0);
          }}
          size="small"
          variant={viewIdx === 0 ? 'contained' : 'text'}
        >
          QUIET
        </Button>
        <Button
          className={classes.headerButton}
          onClick={() => {
            setViewIdx(1);
          }}
          size="small"
          variant={viewIdx === 1 ? 'contained' : 'text'}
        >
          Client
        </Button>
      </PageHeader>
      <Divider />
      <div className={classes.content}>
        {(() => {
          switch (viewIdx) {
            case 0:
              if (patchNotesQUIET === null) {
                return Empty;
              }
              if (patchNotesQUIET === undefined) {
                return <Loading />;
              }
              return patchNotesQUIET.map((note) => {
                return (
                  <div className={classes.note}>
                    <div className={classes.noteHeader}>
                      <Typography variant="h6">{note.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {note.published_at?.format('LL') ?? ''}
                      </Typography>
                    </div>
                    <Typography className={classes.noteBody} variant="body2">
                      {note.body}
                    </Typography>
                  </div>
                );
              });
            case 1:
              if (patchNotes === null) {
                return Empty;
              }
              if (patchNotes === undefined) {
                return <Loading />;
              }
              return patchNotes.map((note) => {
                return (
                  <div className={classes.note}>
                    <div className={classes.noteHeader}>
                      <Typography variant="h6">{note.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {note.published_at.format('LL')}
                      </Typography>
                    </div>
                    <Typography className={classes.noteBody} variant="caption">
                      {note.body}
                    </Typography>
                  </div>
                );
              });
            default:
              return null;
          }
        })()}
      </div>
      <Divider className={classes.footer} />
    </Page>
  );
};

export default PatchNotes;
