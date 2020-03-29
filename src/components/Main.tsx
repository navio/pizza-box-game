import React, { useContext, useEffect, useReducer } from 'react';
import { useObserver } from 'mobx-react';
import { TextField, Button, Box } from '@material-ui/core';
import { fabric } from 'fabric';
import Canvas, {
  getCanvas,
  doesTargetIntersect,
  flip,
  getObjectAtPoint,
  randomizePoint,
  isPointWithinCanvas,
} from './Canvas';
import { StoreContext } from './App';
import useStyles from '../styles';
import { createId, serializeObject } from '../utils';
import { Rule, Point, GameType, ObjWithRuleId } from '../types';
import rootStore from '../stores';

interface State {
  inputText?: string,
  currentShape?: fabric.Object,
  isIntersecting?: boolean,
  existingShape?: fabric.Object,
}

interface Dispatch {
  type: string,
  newState?: Object
}

const INITIAL_RADIUS = 10;

const reducer = (state: State, action: Dispatch) => {
  switch (action.type) {
    case 'clear':
      return {};
    case 'merge':
      return { ...state, ...action.newState };
    default:
      return {};
  }
};

// This may need to change to a class component at some point. We'll see
export default () => {
  const canvas = getCanvas();
  const classes = useStyles();
  const store = useContext(StoreContext);
  const { gameStore, ruleStore } = store; // Cannot destructure past this point for observer to work
  const [state, dispatch] = useReducer(reducer, {});

  const newShapeHandler = (pointer: Point) => {
    const existingShape: fabric.Object | null = getObjectAtPoint(pointer);
    if (existingShape) {
      dispatch({
        type: 'merge',
        newState: { existingShape }
      });
      rootStore.setQuarterLocation(pointer);
      return;
    };

    // TODO: check if enough space on canvas
    const initialPlacement: [number, number] = [pointer.x - INITIAL_RADIUS, pointer.y - INITIAL_RADIUS];

    const playerColor = rootStore.getPropertyOfPlayer(gameStore.game.currentPlayerId, 'color');
    const shape = new fabric.Rect({
      left: initialPlacement[0],
      top: initialPlacement[1],
      width: INITIAL_RADIUS * 2,
      height: INITIAL_RADIUS * 2,
      fill: playerColor,
      hasControls: true,
      lockMovementX: true,
      lockMovementY: true,
      centeredScaling: true,
      // @ts-ignore
      originalFill: playerColor,
    });

    // TODO: check if enough space on canvas
    if (!doesTargetIntersect(shape)) {
      rootStore.setQuarterLocation(pointer);
      canvas.add(shape);
      dispatch({ type: 'merge', newState: { currentShape: shape }});
    } else {
      
    }
  };

  const scaledHandler = (e: fabric.IEvent) => {
    // @ts-ignore stupid interface is wrong
    const targetObj: fabric.Object = e.transform.target;
    if (!targetObj) return;
    // TODO: also enforce max area
    const isIntersecting: boolean = doesTargetIntersect(targetObj);
    dispatch({ type: 'merge', newState: { isIntersecting }});
  };

  useEffect(() => {
    const canvas = getCanvas();
    canvas.on('object:scaled', scaledHandler);
  }, []);

  const createRule = async () => {
    const shape: fabric.Object | undefined = state.currentShape;

    if (shape && state.inputText) {
      shape.selectable = false;
      shape.hasControls = false;
      const ruleId: string = createId('rule');
      // @ts-ignore Adding additional property
      shape.ruleId = ruleId;
      shape.selectable = false;
      shape.hasControls = false;

      const newRule: Rule = {
        id: ruleId,
        playerId: gameStore.game.currentPlayerId,
        displayText: state.inputText,
        data: serializeObject(shape)
      };
      
      await rootStore.createRule(newRule);
      dispatch({ type: 'clear' }); // Clear state
    }
  };

  const updateInputText = (target: EventTarget) => {
    dispatch({
      type: 'merge',
      newState: { inputText: (target as HTMLInputElement).value },
    });
  };

  const canSubmit = !!state.currentShape && !state.isIntersecting && !!state.inputText;

  if (
    gameStore.game.isPlayerBusy && !gameStore.game.hasFlipped &&
    (gameStore.game.type === GameType.local || gameStore.localPlayerId === gameStore.game.currentPlayerId)
  ) {
    flip().then((point: Point) => {
      rootStore.setIndicatorLocation(point);

      setTimeout(() => {
        const quarterLocation: Point = randomizePoint(point);
        
        if (isPointWithinCanvas(quarterLocation)) {
          newShapeHandler(quarterLocation);
        } else {
          const name = rootStore.getPropertyOfPlayer(gameStore.game.currentPlayerId, 'name');
          store.setAlertMessage(`${name} missed the board and drinks four!`);
        }

        rootStore.clearIndicatorLocation();
      }, 2500);
    });
  } else if (state.existingShape) {
    const name = rootStore.getPropertyOfPlayer(gameStore.game.currentPlayerId, 'name');
    const ruleText = ruleStore.rules
      .get((state.existingShape as ObjWithRuleId).ruleId)
      .displayText;
    store.setAlertMessage(`${name} -- ${ruleText}`);
    dispatch({ type: 'clear' });
  }

  return useObserver(() => (
    <main className={classes.main}>
      <div className={classes.toolbarOffset} />
      <Box className={classes.createRuleContainer}>
        <TextField
          label="Rule"
          size="small"
          className={classes.createRuleInput}
          disabled={(!state.currentShape)}
          onChange={({ target }) => { updateInputText(target) }}
          value={state.inputText || ''}
        />
        <Button 
          variant="contained" 
          color="primary" 
          size="small"
          className={classes.createRuleButton}
          disabled={!canSubmit}
          onClick={createRule}
        >
          Create
        </Button>
      </Box>
      
      <Canvas />

      {window.location.hostname === 'localhost' ? 
        <>
          Game: {JSON.stringify(gameStore.game)}<br />
          {'<Main>'} State: {JSON.stringify(state)}
        </> : null}
    </main>
  ));
}