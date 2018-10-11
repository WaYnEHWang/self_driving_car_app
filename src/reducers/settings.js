/* @flow */
import * as types from '../actions/types';

type Action = types.Action;

export type StopPoint = {
  name: string,
  x: string,
  y: string,
}

export type RequestOrder = {
  id: number,
  start: string,
  end: string,
  passenger: number,
  takearide: boolean,
  status: number,
  arrivaltime: number,
  carid: string
}

type State = {
  finishLogin: boolean,
  stopPoints: Array<StopPoint>,
  requestOrders: Array<RequestOrder>,
  accountType: string,
  accessToken: string,
  accountId: string,
  accountEmail: string,
  agreeNotice: boolean,
  enterVersionTwo_pro: boolean,
};

const initialState = {
  finishLogin: false,
  stopPoints: [],
  requestOrders: [],
  accountType: '',
  accessToken: '',
  accountId: '',
  accountEmail: '',
  agreeNotice: false,
  enterVersionTwo_pro: true,
};

export default function settings(state: State = initialState, action: Action): State {
  switch (action.type) {
    case types.FINISH_LOGIN:
    {
      const { finished } = action;
      return {
        ...state,
        finishLogin: finished,
      };
    }
    case types.STOP_POINTS:
    {
      const { points } = action;
      return {
        ...state,
        stopPoints: points,
      };
    }
    case types.REQUEST_ORDERS:
    {
      const { request } = action;
      return {
        ...state,
        requestOrders: request,
      };
    }
    case types.ACCOUNT_TYPE:
    {
      const { Type } = action;
      return {
        ...state,
        accountType: Type,
      };
    }
    case types.ACCESS_TOKEN:
    {
      const { token } = action;
      return {
        ...state,
        accessToken: token,
      };
    }
    case types.ACCOUNT_ID:
    {
      const { id } = action;
      return {
        ...state,
        accountId: id,
      };
    }
    case types.ACCOUNT_EMAIL:
    {
      const { accountEmail } = action;
      return {
        ...state,
        accountEmail,
      };
    }
    case types.AGREE_NOTICE:
    {
      const { agreeNotice } = action;
      return {
        ...state,
        agreeNotice,
      };
    }
    case types.RESET:
    {
      return initialState;
    }
    case types.VERSION_TWO_FLAG_PRO:
    {
      const { versionTwoFlag_pro } = action;
      return {
        ...state,
        enterVersionTwo_pro: versionTwoFlag_pro,
      };
    }
    default:
      return state;
  }
}
