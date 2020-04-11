import React, { useContext, useState } from 'react';
import { useObserver } from 'mobx-react';
import { List,
  Divider,
  Drawer,
  Box,
  Button,
  Modal,
  IconButton,
  Typography,
  ListItem as LI, 
} from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import HelpIcon from '@material-ui/icons/Help';
import ErrorIcon from '@material-ui/icons/Error';
import SettingsRoundedIcon from '@material-ui/icons/SettingsRounded';
import useStyles from '../styles';
import { Player, GameType, Message } from '../types';
import { StoreContext } from './App';
import MessageList from './MessageList';
import PlayerName from './PlayerName';

// 120 seconds until your turn gets skipped
const TIME_LIMIT = 120;
let intervals: number[] = [];

const clearIntervals = () => {
  intervals.forEach((i: number) => window.clearInterval(i));
};
const createInterval = (fn: Function, n: number) => {
  intervals.push(window.setInterval(fn, n));
};

export default () => {
  const classes = useStyles();
  const store = useContext(StoreContext);
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(TIME_LIMIT);
  const { gameStore, playerStore, messageStore } = store;

  const flip = () => {
    clearIntervals();
    store.setPlayerAsBusy();
  };
  const advanceTurn = (message: String) => {
    clearIntervals();
    const name = store.getPropertyOfPlayer(gameStore.game.currentPlayerId, 'name');
    store.createMessage(`${name} ${message}`);
    store.advanceTurn();
    setTimeRemaining(TIME_LIMIT);
  };
  const skipTurn = () => advanceTurn(' skipped their turn.');
  const outOfTime = () => advanceTurn(' ran out of time.');
  const panic = () => {
    clearIntervals();
    const localName = store.getPropertyOfPlayer(gameStore.localPlayerId, 'name');
    const currentName = store.getPropertyOfPlayer(gameStore.game.currentPlayerId, 'name');
    store.createMessage(`${localName} hit the panic button and skipped ${currentName}'s turn.`);
    store.advanceTurn();
    setIsPanicModalOpen(false);
  };
  const downloadMessages = () => {
    const rawMessages: string[] = messageStore.messages
      .map((m: Message) => m.displayString)
      .join('\n');
    const downloadElement: HTMLAnchorElement = document.createElement('a');
    downloadElement.setAttribute('href', `data:text/plain;charset=utf-8,${rawMessages}`);
    downloadElement.setAttribute('download', `messages_${gameStore.game.id}.txt`);
    document.body.appendChild(downloadElement);
    downloadElement.click();
    document.body.removeChild(downloadElement);
  };
  const startTurn = () => {
    (document.getElementById('notification-audio') as HTMLAudioElement).play();
    clearIntervals(); // Just in case
    setTimeRemaining(TIME_LIMIT);
    setCurrentPlayerId(gameStore.game.currentPlayerId);
    createInterval(() => {
      setTimeRemaining(timeRemaining => timeRemaining! - 1);
    }, 1000);
  }

  const canFlip = !gameStore.game.isPlayerBusy && 
    (gameStore.game.type === GameType.local || gameStore.localPlayerId === gameStore.game.currentPlayerId);

  if (canFlip && gameStore.game.id && currentPlayerId !== gameStore.game.currentPlayerId) {
    startTurn();
  }

  if (timeRemaining === 0) {
    outOfTime();
  }

  return useObserver(() => (
    <Drawer 
      variant="permanent" 
      className={classes.drawer}
      classes={{
        paper: classes.drawerPaper
      }}
    >
      <div className={classes.toolbarOffset} />
      <Divider />

      <Button
        color="primary"
        disabled={!canFlip}
        onClick={flip}
      >
        Flip
        {timeRemaining && canFlip ? 
          <span className={classes.sm}>&nbsp;{timeRemaining}</span>
        : null}
      </Button>
      <Divider />

      <Button 
        color="secondary"
        onClick={skipTurn}
        disabled={!canFlip}
      >
        Skip turn
      </Button>
      <Divider />

      <List>
        {playerStore.players.map((p: Player) => (
          <PlayerName player={p} key={p.id} />
        ))}
      </List>
      <Divider />

      <MessageList />
      <Divider />

      {gameStore.game.type === GameType.remote ?  
        <>
          <Button href={`/?join=${gameStore.game.id}`} rel="noopener" target="_blank">
            Share game
          </Button>
          <Divider />
        </>
      : null}

      <Box className={classes.drawerIconButtonBox}>
        <IconButton color="default" aria-label="Github" 
          href="https://github.com/alexqguo" target="_blank" rel="noopener"
        >
          <GitHubIcon />
        </IconButton>
        <IconButton color="default" aria-label="Help" onClick={() => setIsHelpModalOpen(true)}>
          <HelpIcon />
        </IconButton>
        <IconButton color="default" aria-label="Settings" onClick={() => setIsSettingsModalOpen(true)}>
          <SettingsRoundedIcon />
        </IconButton>
        <IconButton aria-label="Panic" onClick={() => setIsPanicModalOpen(true)}>
          <ErrorIcon color="error" />
        </IconButton>

        <Modal className={classes.modal} open={isPanicModalOpen} onClose={() => setIsPanicModalOpen(false)}>
          <div className={classes.modalPaper}>
            <Typography variant="h4">
              Oops!
            </Typography>
            <Typography paragraph>
              Did something go wrong with the game and you got stuck?
              If so, you can press this "Panic" button to skip the current turn which will hopefully reset the game and allow you to continue.
            </Typography>
            <Typography paragraph>
              <strong>Only press this if the game is broken!</strong>&nbsp;
              Otherwise you will interrupt the current player's turn.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => setIsPanicModalOpen(false)}>
              Take me back to the game
            </Button>
            &nbsp;
            <Button variant="contained" color="secondary" onClick={() => panic()}>
              Panic!
            </Button>
          </div>
        </Modal>

        <Modal className={classes.modal} open={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)}>
          <div className={classes.modalPaper}>
            <Typography paragraph>
              Game settings!
            </Typography>
            <Button variant="contained" color="primary" onClick={downloadMessages}>
              Download messages
            </Button>
          </div>
        </Modal>

        <Modal className={classes.modal} open={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)}>
          <div className={classes.modalPaper}>
            <Typography paragraph>
              The rules are simple: you start off with each player's name drawn on the board.
              Players take turns flipping quarters onto the board. If a quarter lands on an empty space, you write a rule and draw a shape around it.
              If the quarter lands on an existing rule, you must perform that rule.
              If the quarter lands on any of the initial spaces, the player whose space it is must drink.
              Keep going until the board is filled with rules.
            </Typography>
            <Typography paragraph>
              Since this is an online game, a few adjustments have to be made to make the game playable. Here are some things to note:
              <List disablePadding dense>
                <LI>- Once your turn starts you can either flip the quarter by pressing "Flip", or just skip your turn</LI>
                <LI>- When flipping, press the space bar to stop the indicator arrows once at a time</LI>
                <LI>- Once your flip location is determined, a bit of randomization happens to simulate the uncertainty of flipping a quarter</LI>
                <LI>- Be careful to make sure you don't miss the board entirely! The punishment will be severe!</LI>
                <LI>- The shapes are squares/rectangles (for now). Feel free to resize or rotate as you'd like, but not too big!</LI>
                <LI>- Once your shape is to your liking, type in your rule and press "Create"</LI>
                <LI>- Currently the game does not end, you just play forever</LI>
              </List>
            </Typography>
            <Typography paragraph>
              Have fun and drink responsibly! Feel free to open issues on my Github page.
            </Typography>
          </div>
        </Modal>
      </Box>
    </Drawer>
  ));
}