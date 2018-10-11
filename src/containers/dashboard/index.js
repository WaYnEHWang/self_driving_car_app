/* @flow */
import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import * as reduxActions from '../../actions';
import MultiLogin from '../login/multiLogin';
// import MainPage from './mainPage';
// import MyRequest from './myRequest';
// import AdminRequest from './adminRequest';
import MainPageV2 from './mainPage_v2';
import MyRequestV2 from './myRequest_v2';
import AdminRequestV2 from './adminRequest_v2';
import type { RequestOrder } from '../../reducers/settings';
import { ApiHelper, ApiHelper_V2 } from '../../utils/apiHelper';

type Props = {
  finishLogin: boolean,
  requestOrders: Array<RequestOrder>,
  // enterVersionTwo: boolean,
  enterVersionTwo_pro: boolean,
};

class Dashboard extends React.PureComponent<Props, State> {
  componentWillMount() {
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  checkRequest = () => {
    const index = this.props.requestOrders.findIndex(data => ApiHelper.checkRequestStatus(data.status));
    return index !== -1;
  }

  checkRequest_V2 = () => {
    const index = this.props.requestOrders.findIndex(data => ApiHelper_V2.checkRequestStatus(data.status));
    return index !== -1;
  }

  render() {
    if (!this.props.finishLogin) {
      return (
        <MultiLogin />
      );
    } else {
      if (this.props.accountType === 'admin') {
        return (
          <AdminRequestV2 />
        );
      } else {
        if (this.checkRequest_V2()) {
          return (
            <MyRequestV2 />
          );
        }
        return (
          <MainPageV2
            showMenu={true}
          />
        );
      }
    }
  }
}

function select(store) {
  return {
    finishLogin: store.settings.finishLogin,
    requestOrders: store.settings.requestOrders,
    accountType: store.settings.accountType,
    enterVersionTwo_pro: store.settings.enterVersionTwo_pro,
  };
}

module.exports = connect(
  select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  })
)(Dashboard);
