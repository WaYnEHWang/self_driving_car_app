/* @flow */
import * as types from '../actions/types';

type Action = types.Action;

type State = {
  position: ?Object,
};

const initialState = {
  position: undefined,
};

export default function location(state: State = initialState, action: Action): State {
  switch (action.type) {
    case types.UPDATE_LOCATION:
    {
      const { position } = action;
      console.log(`update position : ${JSON.stringify(position)}`);
      return {
        ...state,
        position
      };
    }
    default:
      return state;
  }
}
