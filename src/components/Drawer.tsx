import React, { useContext } from 'react';
import { useObserver } from 'mobx-react';
import { List, Divider, Drawer, Box, Button, IconButton, ListItem } from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import HelpIcon from '@material-ui/icons/Help';
import useStyles from '../styles';
import { Player, GameType, Message } from '../types';
import { StoreContext } from './App';
import PlayerName from './PlayerName';

export default () => {
  const classes = useStyles();
  const store = useContext(StoreContext);
  const { gameStore, playerStore, messageStore } = store;

  const skipTurn = () => {
    // store.createMessage
    const name = store.getPropertyOfPlayer(gameStore.game.currentPlayerId, 'name');
    store.createMessage(`${name} skipped their turn.`);
    store.advanceTurn();
  };
  const flip = () => store.setPlayerAsBusy();

  const canFlip = !gameStore.game.isPlayerBusy && 
    (gameStore.game.type === GameType.local || gameStore.localPlayerId === gameStore.game.currentPlayerId);

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

      <List className={classes.messageList}>
        {messageStore.messages.reverse().map((m: Message, i: number) => (
          <ListItem key={i}>
            {m.displayString}
          </ListItem>
        ))}
      </List>
      <Divider />

      <Button onClick={() => {}}>
        Add player
      </Button>
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
        <IconButton color="default" aria-label="Help">
          <HelpIcon />
        </IconButton>
      </Box>
    </Drawer>
  ));
}