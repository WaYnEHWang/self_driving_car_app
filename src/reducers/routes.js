/* @flow */
import { ActionConst } from 'react-native-router-flux';

type State = {
  scene: Object,
}
const initialState = {
  scene: {},
};

export default function reducer(state: State = initialState, action: any = {}) {
  switch (action.type) {
    // focus action is dispatched when a new screen comes into focus
    case ActionConst.FOCUS:
      return {
        ...state,
        scene: action.scene,
      };

    default:
      return state;
  }
}
