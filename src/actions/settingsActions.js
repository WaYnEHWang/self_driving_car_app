/* @flow */
import type { StopPoint, RequestOrder } from '../reducers/settings';
import * as types from './types';

type Action = types.Action;

module.exports = {
  finishLogin: (finished: boolean): Action => ({
    type: types.FINISH_LOGIN,
    finished,
  }),
  reset: (): Action => ({
    type: types.RESET,
  }),
  stopPointsEdit: (points: Array<StopPoint>): Action => ({
    type: types.STOP_POINTS,
    points,
  }),
  requestOrdersEdit: (request: Array<RequestOrder>): Action => ({
    type: types.REQUEST_ORDERS,
    request,
  }),
  accountTypeEdit: (Type: string): Action => ({
    type: types.ACCOUNT_TYPE,
    Type,
  }),
  accessTokenEdit: (token: string): Action => ({
    type: types.ACCESS_TOKEN,
    token,
  }),
  accountIdEdit: (id: string): Action => ({
    type: types.ACCOUNT_ID,
    id
  }),
  accountEmailEdit: (accountEmail: string): Action => ({
    type: types.ACCOUNT_EMAIL,
    accountEmail
  }),
  agreeNoticeEdit: (agreeNotice: boolean): Action => ({
    type: types.AGREE_NOTICE,
    agreeNotice
  }),
  enterVersionTwo_pro: (versionTwoFlag_pro: boolean): Action => ({
    type: types.VERSION_TWO_FLAG_PRO,
    versionTwoFlag_pro,
  }),
};
