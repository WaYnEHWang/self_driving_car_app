/* @flow */
import type { StopPoint, RequestOrder } from '../reducers/settings';
// --- network ---
export const SET_IS_CONNECTED = 'setIsConnected';
export const SET_CONNECT_TYPE = 'setConnectType';

// --- location ---
export const UPDATE_LOCATION = 'updateLocation';
// --- settings ---
export const FINISH_LOGIN = 'finishLogin';
export const RESET = 'reset';
export const STOP_POINTS = 'stopPoints';
export const REQUEST_ORDERS = 'requestOrders';
export const ACCOUNT_TYPE = 'accountType';
export const ACCESS_TOKEN = 'accessToken';
export const ACCOUNT_ID = 'accountId';
export const ACCOUNT_EMAIL = 'accountEmail';
export const AGREE_NOTICE = 'agreeNotice';
export const VERSION_TWO_FLAG_PRO = 'VersionTwoFlagPro';

export type Action =
  // --- network ---
  { type: 'setIsConnected', isConnected: boolean }
  | { type: 'setConnectType', connectType: string }
  | { type: 'updateLocation', position: Object }
  // --- location ---
  // --- settings ---
  | { type: 'finishLogin', finished: boolean }
  | { type: 'stopPoints', stopPoints: Array<StopPoint> }
  | { type: 'requestOrders', requestOrders: Array<RequestOrder>}
  | { type: 'reset' }
  | { type: 'accountType', Type: string }
  | { type: 'accessToken', token: string }
  | { type: 'accountId', id: string }
  | { type: 'accountEmail', accountEmail: string }
  | { type: 'agreeNotice', agreeNotice: boolean }
  | { type: 'VersionTwoFlagPro', versionTwoFlag_pro: boolean };
export type Dispatch = (action: Action | ThunkAction | PromiseAction | Array<Action>) => any;
type GetState = () => Object;
export type ThunkAction = (dispatch: Dispatch, getState: GetState) => any;
export type PromiseAction = Promise<Action>;
