/* @flow */
import React from 'react';
import {
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
  Vibration,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ifIphoneX } from 'react-native-iphone-x-helper';

import * as reduxActions from '../../actions';
import { BarBtn, LoadingModal, BasicController } from '../../components';
import RequestHelper from '../../utils/requestHelper';
import { ApiHelper_V2 } from '../../utils/apiHelper';
import { NativeMqtt, MQTT_REQ } from '../mqtt';
import { ic_cancel, ic_menu } from '../../components/img';
import theme from '../../utils/basicStyle';
import {
  PlaySound, StopSound, PlaySoundRepeat, PlaySoundMusicVolume
} from 'react-native-play-sound';

const strings = require('@strings');

const {
  width: deviceWidth,
  height: deviceHeight
} = Dimensions.get('window');

const TOOLBAR_HEIGHT = (Platform.OS === 'ios' ) ? 64 : 56;
const REQUEST_AREA = deviceHeight - (TOOLBAR_HEIGHT + 350);
const DURATION = 2000;
const PATTERN = [1000, 2000, 3000];
const mqtt_debug = false;

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
  request: Array<{ id: number,
    status: number,
    area_id: string,
    car_id: number,
    type: string,
    gps_start_lat: string,
    gps_start_lon: string,
    gps_end_lat: string,
    gps_end_lon: string,
    error_code: number,
    mark: string,
    trip_distance: number,
    prediction_arrival_start_time: number,
    prediction_arrival_end_time: number,
    arrival_start_at: number,
    arrival_end_at: number}>,
  focusPosition: boolean,
  nearPosition: string,
  carStatus: string,
  adminStatus: string,
  thisRequestId: number,
  carGoDisable: boolean,
}

class AdminRequest_v2 extends BasicController<Props, State> {
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
      thisRequestId: 0,
      carGoDisable: true,
    };
    this.closeMenu = this.closeMenu.bind(this);
    this.openMenu = this.openMenu.bind(this);
    this.preConnectState = 'disconnected';
  }

  _mqttId: any;

  requestAll: Array<{
    id: number,
    status: number,
    area_id: string,
    car_id: number,
    type: string,
    gps_start_lat: string,
    gps_start_lon: string,
    gps_end_lat: string,
    gps_end_lon: string,
    error_code: number,
    mark: string,
    trip_distance: number,
    prediction_arrival_start_time: number,
    prediction_arrival_end_time: number,
    arrival_start_at: number,
    arrival_end_at: number
  }>

  closeMenu: () => void;

  openMenu: () => void;

  async componentWillMount() {
    Actions.refresh({
      hideNavBar: false,
      title: strings.admin,
      navigationBarStyle: styles.navBarStyle,
      leftButtonImage: ic_menu,
      leftButtonIconStyle: { paddingLeft: 14, width: 24, height: 24 },
      onLeft: this.openMenu,
      rightButtonImage: null,
      rightButtonIconStyle: null,
      rightTitle: null,
      onRight: null,
    });
    this._queryRequest();
    // await this.getStopPointsFromServer();
  }

  componentDidMount() {
    const carid = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${this.props.accountId}/carid`;
    const adminStatus = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${this.props.accountId}/adminstatus`;
    this._mqttId = NativeAppEventEmitter.addListener(
      MQTT_REQ.EVENTNAME_MQTT_MESSAGE_EVENT,
      (args) => {
        // const logmsg = `${JSON.stringify(args)}`;
        if (mqtt_debug) console.log(args);
        if (args.title === 'connect') {
          if (args.content !== this.preConnectState && args.content === 'connected') {
            this._queryRequest();
          }
          this.preConnectState = args.content;
        } else {
          if (args.topic.includes(carid)) {
            /* const car = `${MQTT_REQ.MQTT_CAR_TOPIC}${args.content}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
            NativeMqtt.subscribe(car, 2); */
          } else if (args.topic.includes(adminStatus)) {
            /* if (args.content === '50') {
              this._logOut();
            } else {
              this.setState({ adminStatus: args.content });
            } */
          } else if (args.topic.includes(MQTT_REQ.MQTT_REQUEST_TOPIC) && args.topic.includes(MQTT_REQ.REQ_INFO)) {
            const list = [].concat(this.state.request);
            const content = JSON.parse(args.content);
            const requestId = content.id;
            const index = list.findIndex(value => value.id === requestId);
            if (content.status === Number(MQTT_REQ.REQ_STATUS_ACCEPT)) {
              Vibration.vibrate(DURATION);
              console.log('--------------------------------------PlaySound');
              PlaySound('notification');
            }
            if (index > -1) {
              if (args.content.length > 0) {
                try {
                  list[index].id = content.id;
                  list[index].status = content.status;
                  list[index].area_id = content.area_id;
                  list[index].car_id = content.car_id;
                  list[index].type = content.type;
                  list[index].gps_start_lat = content.gps_start_lat;
                  list[index].gps_start_lon = content.gps_start_lon;
                  list[index].gps_end_lat = content.gps_end_lat;
                  list[index].gps_end_lon = content.gps_end_lon;
                  list[index].error_code = content.error_code;
                  list[index].mark = content.mark;
                  list[index].trip_distance = content.trip_distance;
                  list[index].prediction_arrival_start_time = content.prediction_arrival_start_time;
                  list[index].prediction_arrival_end_time = content.prediction_arrival_end_time;
                  list[index].arrival_start_at = content.arrival_start_at;
                  list[index].arrival_end_at = content.arrival_end_at;
                  this.setState({ request: list });
                } catch (e) {
                  console.log(e);
                }
              }
            } else {
              let data = {
                id: requestId,
                status: 0,
                area_id: '',
                car_id: 0,
                type: '',
                gps_start_lat: '',
                gps_start_lon: '',
                gps_end_lat: '',
                gps_end_lon: '',
                error_code: 0,
                mark: '',
                trip_distance: 0,
                prediction_arrival_start_time: 0,
                prediction_arrival_end_time: 0,
                arrival_start_at: 0,
                arrival_end_at: 0
              };
              if (args.content.length > 0) {
                try {
                  data = JSON.parse(args.content);
                } catch (e) {
                  console.log(e);
                }
              }
              list.push(data);
              this.setState({ request: list });
              if (Platform.OS === 'android') {
                if (data.status !== '' && ApiHelper_V2.checkRequestStatus(Number(data.status))) {
                  NativeMqtt.sendRequestNotification();
                }
              }
            }
          } else if (args.topic.includes('route')) {
            /* if (args.content.length > 0 && args.content !== 'null') {
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
            } */
          } else if (args.topic.includes('takearide')) {
            /* if (args.content !== null) {
              if (this.state.takearide !== args.content) {
                this.setState({ takearide: args.content });
              }
            } */
          } else if (args.topic.includes('emptyseats')) {
            /* if (args.content !== null) {
              if (this.state.emptyseats !== args.content) {
                this.setState({ emptyseats: args.content });
              }
            } */
          } else if (args.topic.includes('realtime_info')) {
            /* if (args.content.length > 0) {
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
            } */
          } else if (args.topic.includes('carstatus')) {
            /* if (this.state.carStatus !== args.content) {
              this.setState({ carStatus: args.content });
            } */
          } else if (args.topic.includes(MQTT_REQ.MQTT_CAR_TOPIC) && args.topic.includes(MQTT_REQ.CAR_LOGS)) {
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
      // await this.getStopPointsFromServer();
      if (Platform.OS === 'ios') {
        this._queryRequest();
      }
    }
  }

  _queryRequest = () => {
    const admin = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${this.props.accountId}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    const request = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_REQUEST_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    NativeMqtt.subscribe(admin, 1);
    NativeMqtt.subscribe(request, 1);
    const car = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_CAR_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    NativeMqtt.subscribe(car, 1);
  }

  carDeparture = async (requestID: Number) => {
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken } = this.props;
    const { errorCode, errorMessage } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? `${RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_REQUEST)}/${requestID}/${RequestHelper.V2_REQUEST_GO}` : `${RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_REQUEST)}/${requestID}/${RequestHelper.V2_REQUEST_GO}`,
      'POST',
      JSON.stringify({
        requestId: Number(requestID),
      }),
      { 'content-type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    );
    if (errorCode === RequestHelper.errorCode.NO_ERROR) {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      console.log('carDeparture success');
      this.setState({ carGoDisable: true });
    } else {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      console.log(`carDeparture fail error msg = ${errorMessage}`);
      // const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(errorCode) === RequestHelper.errorCode.UNAUTHORIZED
        && Number(errorCode) === RequestHelper.errorCode.SERVER_ACCOUNT_ERROR
        && Number(errorCode) === RequestHelper.errorCode.SERVER_DATA_ERROR) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  cancelRequest = async (data: Object) => {
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken } = this.props;
    const { errorCode, errorMessage } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? `${RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_REQUEST)}/${data.id}/${RequestHelper.V2_REQUEST_CANCEL}` : `${RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_REQUEST)}/${data.id}/${RequestHelper.V2_REQUEST_CANCEL}`,
      'POST',
      '',
      { 'content-type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    );
    this._loadingModal && this._loadingModal.hideLoadingPage();
    if (errorCode === RequestHelper.errorCode.NO_ERROR) {
      console.log('cancelRequest success');
      this.setState({ carGoDisable: true });
    } else {
      console.log(`cancelRequest fail error msg = ${errorMessage}`);
      // const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(errorCode) === RequestHelper.errorCode.UNAUTHORIZED
        && Number(errorCode) === RequestHelper.errorCode.SERVER_ACCOUNT_ERROR
        && Number(errorCode) === RequestHelper.errorCode.SERVER_DATA_ERROR) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  _logOut = async () => {
    const { accessToken, accountEmail } = this.props;
    console.log(`logout accessToken: ${accessToken}, accountEmail: ${accountEmail}`);
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { errorCode, errorMessage } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_USER_LOGOUT) : RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_USER_LOGOUT),
      'POST',
      '',
      { 'content-type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    );
    this._loadingModal && this._loadingModal.hideLoadingPage();
    this._timeoutID = setTimeout(() => {
      if (errorCode === RequestHelper.errorCode.NO_ERROR) {
        console.log('_logOut success');
        RequestHelper.handleLogout(this.props.actions);
      } else {
        console.log(`_logOut fail error msg = ${errorMessage}`);
        if (Number(errorCode) < RequestHelper.errorCode.SERVER_ERROR) {
          RequestHelper.handleLogout(this.props.actions);
        } else {
          // const errorCode = (typeof content === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
          this.handleServerError(errorCode);
        }
      }
    }, 200);
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
      const { accountEmail } = this.props;
      const searchTerm = '@';
      const indexOfFirst = accountEmail.indexOf(searchTerm);
      const accountName = `${accountEmail}`.substr(0, indexOfFirst);
      const logoutStr = `${strings.logout} ${accountName}`;
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
              >
                {logoutStr}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }

  checkRequest = (id: number, status: number) => {
    if (status === 101) {
      this.setState({
        thisRequestId: id,
        carGoDisable: false
      });
    } else {
      this.setState({
        thisRequestId: id,
        carGoDisable: true
      });
    }
  }

  renderCarItem = (title: string, content: string, focus: ? boolean) => (
    <View style={{ flex: 1, alignItems: 'center', }}>
      <Text style={styles.contentTitle}>
        {title}
      </Text>
      <Text style={[styles.ContentText, { color: focus ? 'red' : 'rgba(0, 0, 0, 0.87)', fontSize: focus ? 20 : 16 }]}>
        {content}
      </Text>
    </View>
  )

  render() {
    return (
      <View style={styles.container}>
        <View style={[styles.boxContainer, { height: REQUEST_AREA  }]}>
          <View style={[styles.titleArea, { backgroundColor: 'red' }]}>
            <Text style={styles.sectionTitle}>
              {`Acer ${strings.request_list}`}
            </Text>
          </View>
          <View style={styles.contentArea}>
            <ScrollView>
              {this.state.request.map((data, index) => {
                if (ApiHelper_V2.checkRequestStatus(Number(data.status))) {
                  console.log(`++++++ MyRequest_v2 renderList data.status = ${data.status}`);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.5}
                      key={`request-${String(index)}`}
                      onPress={() => { this.checkRequest(Number(data.id), Number(data.status)); }}
                    >
                      <View key={`request-${String(index)}`} style={styles.ListArea}>
                        {this.renderCarItem(strings.request_id, data.id)}
                        <View style={styles.divView} />
                        {this.renderCarItem(strings.request_status, data.status)}
                        <View style={styles.divView} />
                        {this.renderCarItem(strings.car_id, String(data.car_id))}
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
                    </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>
              {`${strings.driving_info}`}
            </Text>
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
            onPress={() => { Actions.MainPage_v2({ add: true }); }}
            fontSize={14}
            disabled={true}
          />
          <BarBtn
            title={strings.interrupt.toUpperCase()}
            bgColor="red"
            containerStyle={[styles.btnContainer, { marginRight: 16 }]}
            onPress={this.adminInterrupt}
            fontSize={14}
            disabled={true}
          />
          <BarBtn
            onPress={() => { this.carDeparture(this.state.thisRequestId); }}
            title={strings.departure.toUpperCase()}
            bgColor="darkorange"
            containerStyle={styles.btnContainer}
            fontSize={20}
            disabled={this.state.carGoDisable}
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
    enterVersionTwo_pro: store.settings.enterVersionTwo_pro,
  };
}

module.exports = connect(
  select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  })
)(AdminRequest_v2);
