/* @flow */
import * as types from '../actions/types';

type Action = types.Action;

type State = {
  isConnected: ?boolean,
  connectType: ?string,
};

const initialState = {
  isConnected: undefined,
  connectType: undefined,
};

export default function network(state: State = initialState, action: Action): State {
  switch (action.type) {
    case types.SET_IS_CONNECTED:
    {
      const { isConnected } = action;
      console.log(`connectivity changed to ${String(isConnected)}`);
      return {
        ...state,
        isConnected,
      };
    }
    case types.SET_CONNECT_TYPE:
    {
      const { connectType } = action;
      console.log(`connectivity type changed to ${String(connectType)}`);
      return {
        ...state,
        connectType,
      };
    }
    default:
      return state;
  }
}
