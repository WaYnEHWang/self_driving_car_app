/* @flow */
/* eslint function-paren-newline: ["error", "consistent"] */
import * as React from 'react';
import {
  NetInfo,
  Platform,
} from 'react-native';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  Scene, Router, Actions, ActionConst
} from 'react-native-router-flux';
import SplashScreen from 'react-native-splash-screen';

import Dashboard from './containers/dashboard';
import MultiLogin from './containers/login/multiLogin';
// import MainPage from './containers/dashboard/mainPage';
// import MyRequest from './containers/dashboard/myRequest';
import MainPage_v2 from './containers/dashboard/mainPage_v2';
import MyRequest_v2 from './containers/dashboard/myRequest_v2';
// import { ic_back } from './components/img';

import * as reduxActions from './actions';
import theme from './utils/basicStyle';
// import { RemoteNotification } from './components';
const strings = require('@strings');

const { PUSH } = ActionConst;

const NavBarTitleStyle = {
  color: '#FAFAFA',
  marginTop: -2,
  fontSize: 18,
  ...Platform.select({
    android: {
      fontFamily: 'sans-serif-medium',
    },
  }),
  alignSelf: 'center',
};

function renderSceneWithBackkey(key: string, title: string, type: string, component: React.ComponentType<any>) {
  return (
    <Scene key={key} component={component} title={title} titleStyle={NavBarTitleStyle} type={type} hideNavBar={false} hideTabBar={true} />
  );
}

const scenes = Actions.create(
  <Scene key="root">
    <Scene
      key="Dashboard"
      component={Dashboard}
      initial={true}
      hideTabBar={true}
      hideNavBar={false}
      type={PUSH}
      title={strings.app_name}
      titleStyle={NavBarTitleStyle}
      onRight={() => {}}
      rightTitle=""
      rightButtonImage=""
    />
    <Scene key="MultiLogin" component={MultiLogin} hideTabBar={true} hideNavBar={true} type={PUSH} />
    {renderSceneWithBackkey('MainPage_v2', strings.request, PUSH, MainPage_v2)}
    {renderSceneWithBackkey('MyRequest_v2', strings.my_request, PUSH, MyRequest_v2)}
  </Scene>
);

const RouterWithRedux = connect()(Router);

type Props = {
  actions: reduxActions,
};

class Entry extends React.Component<Props> {
  constructor(props) {
    super(props);
    this.props.actions.setIsConnected(false);
    this.props.actions.setConnectType(undefined);
  }

  componentDidMount() {
    SplashScreen.hide();
    NetInfo.addEventListener('connectionChange', this.dispatchConnected);
    NetInfo.getConnectionInfo().done(connectionInfo => this.dispatchConnected(connectionInfo));
    // RemoteNotification.appDidMount();
  }

  componentWillUnmount() {
    NetInfo.removeEventListener('connectionChange', this.dispatchConnected);
  }

  dispatchConnected = (connectionInfo, connectType) => {
    let isConnected = false;
    console.log(`NetInfo dispatchConnected connectionInfo.type = ${connectionInfo.type}`);
    if (connectionInfo.type !== 'none' && connectionInfo.type !== 'unknown') {
      isConnected = true;
    }
    this.props.actions.setIsConnected(isConnected);
    this.props.actions.setConnectType(connectType);
  };

  render() {
    return (
      <RouterWithRedux
        scenes={scenes}
        navigationBarStyle={theme.router.navbarStyle}
        leftButtonStyle={theme.router.leftBtnStyle}
        rightButtonStyle={theme.router.rightBtnStyle}
        titleWrapperStyle={theme.router.titleWrapperStyle}
      />
    );
  }
}

function select(store) {
  return {
    isConnected: store.network.isConnected,
  };
}

module.exports = connect(select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  }))(Entry);
