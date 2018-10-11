/* @flow */
import React from 'react';
import {
  Alert,
  AppState,
  Dimensions,
  StyleSheet,
  Text,
  View,
  Platform,
  NativeAppEventEmitter,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ifIphoneX } from 'react-native-iphone-x-helper';

import * as reduxActions from '../../actions';
import { BarBtn, LoadingModal, BasicController } from '../../components';
import RequestHelper from '../../utils/requestHelper';
import ApiHelper from '../../utils/apiHelper';
import { NativeMqtt, MQTT_REQ } from '../mqtt';
import { ic_cancel, ic_menu } from '../../components/img';
import theme from '../../utils/basicStyle';

const strings = require('@strings');

const {
  width: deviceWidth,
  height: deviceHeight
} = Dimensions.get('window');

const TOOLBAR_HEIGHT = (Platform.OS === 'ios' ) ? 64 : 56;
const REQUEST_AREA = deviceHeight - (TOOLBAR_HEIGHT + 350);

type Props = {
  actions: reduxActions,
  accountId: string,
  accountEmail: string,
  accessToken: string,
}
type State = {
  path: string,
  openMenu: boolean,
  takearide: string,
  emptyseats: string,
  request: Array<{id: string, status: string, start: string, end: string, people: number, adminId: string}>,
  focusPosition: boolean,
  nearPosition: string,
  carStatus: string,
  adminStatus: string,
}

class AdminRequest extends BasicController<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      path: '',
      openMenu: false,
      takearide: 'no',
      emptyseats: '0',
      request: [],
      focusPosition: false,
      nearPosition: '',
      carStatus: '',
      adminStatus: '',
    };
    this.closeMenu = this.closeMenu.bind(this);
    this.openMenu = this.openMenu.bind(this);
    this.preConnectState = 'disconnected';
  }
  _mqttId: any;
  requestAll: Array<{id: string, status: string, start: string, end: string, people: number, adminId: string}>

  closeMenu: () => void;
  openMenu: () => void;

  async componentWillMount() {
    Actions.refresh({
      hideNavBar: false,
      title: strings.admin,
      navigationBarStyle: styles.navBarStyle,
      leftButtonImage: ic_menu,
      leftButtonIconStyle: { paddingLeft: 14, width: 24, height: 24 },
      onLeft: this.openMenu
    });
    this._queryRequest();
    await this.getStopPointsFromServer();
  }

  componentDidMount() {
    const carid = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${this.props.accountId}/carid`;
    const adminStatus = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${this.props.accountId}/adminstatus`;
    this._mqttId = NativeAppEventEmitter.addListener(
      MQTT_REQ.EVENTNAME_MQTT_MESSAGE_EVENT,
      (args) => {
        const logmsg = `${JSON.stringify(args)}`;
        console.log(`MQTT msg: ${logmsg}`);
        if (args.title === 'connect') {
          if (args.content !== this.preConnectState && args.content === 'connected') {
            this._queryRequest();
          }
          this.preConnectState = args.content;
        } else {
          if (args.topic.includes(carid)) {
            const car = `${MQTT_REQ.MQTT_CAR_TOPIC}${args.content}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
            NativeMqtt.subscribe(car, 2);
          } else if (args.topic.includes(adminStatus)) {
            if (args.content === '50') {
              this._logOut();
            } else {
              this.setState({ adminStatus: args.content });
            }
          } else if (args.topic.includes(MQTT_REQ.MQTT_REQUEST_TOPIC)) {
            const list = [].concat(this.state.request);
            const requestId = args.topic.slice(args.topic.indexOf('/') + 1, args.topic.lastIndexOf('/'));
            const index = list.findIndex(value => value.id === requestId);
            if (index > -1) {
              if (args.topic.includes('basicinfo')) {
                if (args.content.length > 0) {
                  try {
                    const info = JSON.parse(args.content);
                    list[index].start = info.start;
                    list[index].end = info.end;
                    list[index].people = info.people;
                    this.setState({ request: list });
                  } catch (e) {
                    console.log(e);
                  }
                }
              } else if (args.topic.includes('requeststatus')) {
                list[index].status = args.content;
                this.setState({ request: list });
              } else if (args.topic.includes('adminid')) {
                list[index].adminId = args.content;
                this.setState({ request: list });
              }
            } else {
              let info = {
                start: '',
                end: '',
                people: 0
              };
              let requeststatus = '';
              let adminid = '';
              if (args.topic.includes('basicinfo')) {
                if (args.content.length > 0) {
                  try {
                    info = JSON.parse(args.content);
                  } catch (e) {
                    console.log(e);
                  }
                }
              } else if (args.topic.includes('requeststatus')) {
                requeststatus = args.content;
              } else if (args.topic.includes('adminid')) {
                adminid = args.content;
              }
              const data = {
                id: requestId,
                status: requeststatus,
                start: info.start,
                end: info.end,
                people: info.people,
                adminId: adminid
              };
              list.push(data);
              this.setState({ request: list });
              if (Platform.OS === 'android') {
                if (requeststatus !== '' && ApiHelper.checkRequestStatus(Number(requeststatus))) {
                  NativeMqtt.sendRequestNotification();
                }
              }
            }
          } else if (args.topic.includes('route')) {
            if (args.content.length > 0 && args.content !== 'null') {
              try {
                const data = JSON.parse(args.content);
                if (typeof data.path !== 'undefined') {
                  if (data.path !== null) {
                    if (this.state.path !== data.path) {
                      this.setState({ path: data.path });
                    }
                  } else {
                    this.setState({ path: '' });
                  }
                } else {
                  this.setState({ path: '' });
                }
              } catch (e) {
                console.log(e);
              }
            }
          } else if (args.topic.includes('takearide')) {
            if (args.content !== null) {
              if (this.state.takearide !== args.content) {
                this.setState({ takearide: args.content });
              }
            }
          } else if (args.topic.includes('emptyseats')) {
            if (args.content !== null) {
              if (this.state.emptyseats !== args.content) {
                this.setState({ emptyseats: args.content });
              }
            }
          } else if (args.topic.includes('realtime_info')) {
            if (args.content.length > 0) {
              try {
                const carInfo = JSON.parse(args.content);
                const focus = ( this.state.path.includes(carInfo.nearposition) && carInfo.neardistance === 0);
                if (this.state.focusPosition !== focus) {
                  this.setState({ focusPosition: focus });
                }

                if (this.state.nearPosition !== carInfo.nearposition) {
                  this.setState({ nearPosition: carInfo.nearposition });
                }
              } catch (e) {
                console.log(e);
              }
            }
          } else if (args.topic.includes('carstatus')) {
            if (this.state.carStatus !== args.content) {
              this.setState({ carStatus: args.content });
            }
          }
        }
      }
    );

    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    this._mqttId && NativeAppEventEmitter.removeSubscription(this._mqttId);
    this._timeoutID && clearTimeout(this._timeoutID);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _loadingModal: ?LoadingModal;
  _timeoutID: ?any;
  preConnectState: string;

  openMenu(): void {
    this.setState({ openMenu: true });
  }

  closeMenu(): void {
    this.setState({ openMenu: false });
  }

  _handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      // do something when app active
      await this.getStopPointsFromServer();
      if (Platform.OS === 'ios') {
        this._queryRequest();
      }
    }
  }

  getStopPointsFromServer = async () => {
    const { content } = await RequestHelper.getResponse(
      RequestHelper.getServiceURL(RequestHelper.SERVER_USER_INFO),
      'POST',
      JSON.stringify({
        type: 'POSITION',
        email: this.props.accountEmail,
        token: this.props.accessToken,
      })
    );
    if (content.status) {
      let list = [];
      list = list.concat(content.points);
      this.props.actions.stopPointsEdit(list);
      console.log(`getStopPointsFromServer success list = ${JSON.stringify(list)}`);
    } else {
      console.log(`getStopPointsFromServer fail content.error = ${content.error}`);
      const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(content.error) > 900 && Number(content.error) < 905) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  _queryRequest = () => {
    const admin = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${this.props.accountId}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    const request = `${MQTT_REQ.MQTT_REQUEST_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    NativeMqtt.subscribe(admin, 2);
    NativeMqtt.subscribe(request, 2);
    // const car = `${MQTT_REQ.MQTT_CAR_TOPIC}c1/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    // NativeMqtt.subscribe(car, 2);
  }

  carDeparture = async () => {
    console.log('car to go');
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken, accountEmail } = this.props;
    const { content } = await RequestHelper.getResponse(
      RequestHelper.getServiceURL(RequestHelper.SERVER_CAR_TO_GO),
      'POST',
      JSON.stringify({
        adminid: Number(this.props.accountId),
        email: accountEmail,
        token: accessToken,
      })
    );
    if (content.status) {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      console.log(`carDeparture success content = ${JSON.stringify(content)}`);
    } else {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      console.log(`carDeparture fail error msg = ${content.error}`);
      const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(content.error) > 900 && Number(content.error) < 905) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  adminInterrupt = async () => {
    console.log('adminInterrupt');
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken, accountEmail } = this.props;
    const { content } = await RequestHelper.getResponse(
      RequestHelper.getServiceURL(RequestHelper.SERVER_ADMIN_INTERRUPT),
      'POST',
      JSON.stringify({
        adminid: Number(this.props.accountId),
        email: accountEmail,
        token: accessToken,
      })
    );
    if (content.status) {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      console.log(`adminInterrupt success content = ${JSON.stringify(content)}`);
      this._logOut();
    } else {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(content.error) > 900 && Number(content.error) < 905) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  cancelRequest = async (data: Object) => {
    const { accessToken, accountEmail } = this.props;
    const { content } = await RequestHelper.getResponse(
      RequestHelper.getServiceURL(RequestHelper.SERVER_USER_CANCEL),
      'POST',
      JSON.stringify({
        request_ID: data.id,
        email: accountEmail,
        token: accessToken,
      })
    );
    if (content.status) {
      console.log(`cancelRequest success content = ${JSON.stringify(content)}`);
    } else {
      console.log(`cancelRequest fail error msg = ${content.error}`);
      const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(content.error) > 900 && Number(content.error) < 905) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  _logOut = async () => {
    console.log('logout');
    const { accessToken, accountEmail } = this.props;
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { content } = await RequestHelper.getResponse(
      RequestHelper.getServiceURL(RequestHelper.SERVER_USER_LOGOUT),
      'POST',
      JSON.stringify({
        email: accountEmail,
        token: accessToken,
      })
    );
    this._loadingModal && this._loadingModal.hideLoadingPage();
    if (content.status) {
      console.log(`_logOut success content = ${JSON.stringify(content)}`);
      RequestHelper.handleLogout(this.props.actions);
    } else {
      console.log(`_logOut fail content = ${JSON.stringify(content)}`);
      console.log(`_logOut fail error msg = ${content.error}`);
      if (Number(content.error) > 900 && Number(content.error) < 905) {
        RequestHelper.handleLogout(this.props.actions);
      } else {
        this.handleServerError(content.error);
      }
    }
  }

  checkCarStatus = (status: string) => {
    if (Number(status) === 10) {
      return 'error';
    } else if (Number(status) === 11) {
      return 'Idle';
    }  else if (Number(status) === 12) {
      return 'Using';
    }  else if (Number(status) === 13) {
      return 'service paused';
    } else {
      return '';
    }
  }

  checkAdminStatus = (status: string) => {
    if (Number(status) === 50) {
      return 'Not SignIn';
    } else if (Number(status) === 51) {
      return 'Idle';
    }  else if (Number(status) === 52) {
      return 'Busy';
    }  else if (Number(status) === 53) {
      return 'service paused';
    } else {
      return '';
    }
  }


  _renderDroupDownMenu(): ?Object {
    if (this.state.openMenu) {
      return (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.fullScreen} onPress={this.closeMenu} activeOpacity={0.5} />
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItemArea}
              onPress={() => {
                this._logOut();
                this.closeMenu();
              }}
              activeOpacity={0.5}
            >
              <Text
                style={styles.menuText}
              >{strings.logout}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }

  renderCarItem = (title: string, content: string, focus: ? boolean) =>
    (
      <View style={{ flex: 1, alignItems: 'center', }}>
        <Text style={styles.contentTitle}>{title}</Text>
        <Text style={[styles.ContentText, { color: focus ? 'red' : 'rgba(0, 0, 0, 0.87)', fontSize: focus ? 20 : 16 }]}>{content}</Text>
      </View>
    )

  render() {
    return (
      <View style={styles.container}>
        <View style={[styles.boxContainer, { height: REQUEST_AREA  }]}>
          <View style={[styles.titleArea, { backgroundColor: 'red' }]}>
            <Text style={styles.sectionTitle}>{`Acer ${strings.request_list}`}</Text>
          </View>
          <View style={styles.contentArea}>
            <ScrollView>
              {this.state.request.map((data, index) => {
                console.log(`MyRequest renderList data.status = ${data.status}, data = ${JSON.stringify(data)}, data.adminId = ${data.adminId}, this.props.accountId = ${this.props.accountId}`);
                if (ApiHelper.checkRequestStatus(Number(data.status)) && data.adminId === this.props.accountId) {
                  console.log(`++++++ MyRequest renderList data.status = ${data.status}`);
                  return (
                    <View key={`request-${String(index)}`} style={styles.ListArea}>
                      {this.renderCarItem(strings.start_point, data.start)}
                      <View style={styles.divView} />
                      {this.renderCarItem(strings.end_point, data.end)}
                      <View style={styles.divView} />
                      {this.renderCarItem(strings.passenger, String(data.people))}
                      <TouchableOpacity
                        activeOpacity={0.5}
                        style={{ flex: 1, padding: 16, alignItems: 'center', }}
                        onPress={() => { this.cancelRequest(data); }}
                      >
                        <View>
                          <Image source={ic_cancel} style={styles.cancel} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                  } else {
                    return null;
                  }
                })}
            </ScrollView>
          </View>
        </View>
        <View style={styles.boxContainer}>
          <View style={[styles.titleArea, { backgroundColor: 'yellowgreen' }]}>
            <Text style={styles.sectionTitle}>{`${strings.driving_info}`}</Text>
          </View>
          <View style={styles.contentArea}>
            <View style={[styles.carArea, { borderBottomColor: 'rgba(0, 0, 0, 0.12)', borderBottomWidth: 1 }]}>
              {this.renderCarItem(strings.path, `${this.state.path}`)}
              <View style={styles.divView} />
              {this.renderCarItem(strings.go_to, (this.state.focusPosition) ? `${this.state.nearPosition}, ${strings.press_go}` : `${this.state.nearPosition}`, this.state.focusPosition)}
              <View style={styles.divView} />
              {this.renderCarItem(strings.car_status, this.checkCarStatus(this.state.carStatus))}
            </View>
            <View style={styles.carArea}>
              {this.renderCarItem(strings.share_car, this.state.takearide)}
              <View style={styles.divView} />
              {this.renderCarItem(strings.empty_seats, this.state.emptyseats)}
              <View style={styles.divView} />
              {this.renderCarItem(strings.admin_status, this.checkAdminStatus(this.state.adminStatus))}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginHorizontal: 16 }}>
          <BarBtn
            title={strings.add_request.toUpperCase()}
            bgColor="rgb(48, 184, 249)"
            containerStyle={[styles.btnContainer, { marginRight: 16 }]}
            onPress={() => { Actions.MainPage({ add: true }); }}
            fontSize={14}
          />
          <BarBtn
            title={strings.interrupt.toUpperCase()}
            bgColor="red"
            containerStyle={[styles.btnContainer, { marginRight: 16 }]}
            onPress={this.adminInterrupt}
            fontSize={14}
          />
          <BarBtn
            onPress={this.carDeparture}
            title={strings.departure.toUpperCase()}
            bgColor="darkorange"
            containerStyle={styles.btnContainer}
            fontSize={20}
          />
        </View>
        <LoadingModal ref={(c) => { this._loadingModal = c; }} />
        {this._renderDroupDownMenu()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#fff',
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  txtContent: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.87)',
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  btnContainer: {
    marginBottom: 16,
    height: 84,
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 42
  },
  boxContainer: {
    ...theme.card,
    height: 152,
    width: (deviceWidth - 32),
    marginBottom: 24,
  },
  titleArea: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentArea: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    flex: 1,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  fullScreen: {
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    flex: 1,
  },
  menu: {
    position: 'absolute',
    left: 8,
    flexDirection:'column',
    backgroundColor: '#fff',
    ...Platform.select({
      android: {
        elevation: 5,
        top: 54,
      },
      ios: {
        ...ifIphoneX({ top: 88 }, { top: 64 }),
        shadowColor: '#222222',
        shadowOpacity: 0.4,
        shadowRadius: 2,
        shadowOffset: {
          height: 1,
          width: 1
        },
      },
    }),
  },
  menuItemArea: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'column',
    justifyContent: 'center',
    borderBottomWidth: 0.66,
    borderBottomColor: 'rgba(224,224,224,0.54)'
  },
  menuText: {
    fontSize: 16,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    color: 'rgba(0,0,0,0.87)',
  },
  carArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentTitle: {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.54)',
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    marginBottom: 8,
  },
  ContentText: {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 16,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  divView: {
    width: 1.1,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  ListArea: {
    width: deviceWidth,
    height: 72,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cancel:{
    width: 24,
    height:24,
  },
  navBarStyle: {
    borderBottomWidth: 0,
    backgroundColor: '#52b7a2',
    ...ifIphoneX({ height: 88 }, {}),
  }
});

function select(store) {
  return {
    accountId: store.settings.accountId,
    accountEmail: store.settings.accountEmail,
    accessToken: store.settings.accessToken,
  };
}

module.exports = connect(
  select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  })
)(AdminRequest);
