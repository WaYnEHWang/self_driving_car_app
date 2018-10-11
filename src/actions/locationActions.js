/* @flow */
import * as types from './types';

type Action = types.Action;

module.exports = {
  updateLocation: (position: Object): Action => ({
    type: types.UPDATE_LOCATION,
    position,
  }),
};
