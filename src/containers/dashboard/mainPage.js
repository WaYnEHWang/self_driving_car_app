/* @flow */
import React from 'react';
import {
  Alert,
  AppState,
  Dimensions,
  ImageBackground,
  InteractionManager,
  NativeAppEventEmitter,
  Platform,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import MapView from 'react-native-maps';
import { ifIphoneX } from 'react-native-iphone-x-helper';

import * as reduxActions from '../../actions';

import type { StopPoint, RequestOrder } from '../../reducers/settings';
import { BarBtn, Checkbox, DateTimePicker, LoadingModal, BasicController, EULAModal } from '../../components';
import FormatHelper from '../../utils/formatHelper';
import { NativeMqtt, MQTT_REQ } from '../mqtt';
import { ic_location, ic_back, ic_menu } from '../../components/img';
import PointsModal from './pointsModal';
import RequestHelper from '../../utils/requestHelper';
import theme from '../../utils/basicStyle';
import ApiHelper from '../../utils/apiHelper';

const strings = require('@strings');

const {
  width: deviceWidth,
  height: deviceHeight,
} = Dimensions.get('window');

const MARKER_SIZE = 28;
const TOOLBAR_HEIGHT = (Platform.OS === 'ios' ) ? 64 : 56;
const VIEW_AREA = 40 + 48 + 88;
const MAPVIEWHEIGHT = deviceHeight - TOOLBAR_HEIGHT - VIEW_AREA;

type Props = {
  stopPoints: Array<StopPoint>,
  requestOrders: Array<RequestOrder>,
  actions: reduxActions,
  accountEmail: string,
  accessToken: string,
};

type State = {
  shareCheck: boolean,
  pickupTime: Date,
  passenger: number,
  admins: Array<{id: string, status: string}>,
  startPoint: string,
  endPoint: string,
  openMenu: boolean,
  systemStatus: boolean,
  carsPosition: Array<{id: string, latitude: number, longitude: number}>,
}

class MainPage extends BasicController<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      shareCheck: true,
      pickupTime: new Date(),
      passenger: 1,
      admins: [],
      startPoint: '',
      endPoint: '',
      openMenu: false,
      systemStatus: false,
      carsPosition: [],
    };
    this.showPickTime = false;
    this.closeMenu = this.closeMenu.bind(this);
    this.openMenu = this.openMenu.bind(this);
    this.requestList = [];
    this.preConnectState = 'disconnected';
    this.addRequest = this.props.add || false;
  }

  closeMenu: () => void;
  openMenu: () => void;
  addRequest: boolean;

  async componentWillMount() {
    if (this.props.showMenu) {
      Actions.refresh({
        hideNavBar: false,
        navigationBarStyle: theme.router.navbarStyle,
        title: strings.app_name,
        leftButtonImage: ic_menu,
        leftButtonIconStyle: { paddingLeft: 14, width: 24, height: 24 },
        onLeft: this.openMenu
      });
    } else {
      Actions.refresh({
        hideNavBar: false,
        navigationBarStyle: theme.router.navbarStyle,
        title: strings.request,
        backButtonImage: ic_back,
        leftButtonIconStyle: { paddingLeft: 14, width: 24, height: 24 },
        onLeft: Actions.pop
      });
    }
    this._queryRequest();
    this.getOperationStatus();
    await this.getStopPointsFromServer();
  }

  componentDidMount() {
    this._mqttId = NativeAppEventEmitter.addListener(
      MQTT_REQ.EVENTNAME_MQTT_MESSAGE_EVENT,
      (args) => {
        const logmsg = `${JSON.stringify(args)}`;
        console.log(`MQTT logmsg = ${JSON.stringify(logmsg)}`);
        if (args.title === 'connect') {
          if (args.content !== this.preConnectState && args.content === 'connected') {
            this._queryRequest();
            this.getOperationStatus();
          }
          this.preConnectState = args.content;
        } else {
          const list = [].concat(this.state.admins);
          if (args.topic.includes('adminstatus')) {
            if (args.content !== null) {
              const adminId = args.topic.slice(args.topic.indexOf('/') + 1, args.topic.lastIndexOf('/'));
              if (list.length > 0) {
                const index = list.findIndex(value => value.id === adminId);
                if ( index !== -1) {
                  list[index].status = args.content;
                } else {
                  const data = {
                    id: args.topic.slice(args.topic.indexOf('/') + 1, args.topic.lastIndexOf('/')),
                    status: args.content
                  };
                  list.push(data);
                }
              } else {
                const data = {
                  id: args.topic.slice(args.topic.indexOf('/') + 1, args.topic.lastIndexOf('/')),
                  status: args.content
                };
                list.push(data);
              }
              this.setState({ admins: list });
            }
          } else if (args.topic.includes('systemstatus')) {
            this.setState({
              systemStatus: (args.content === 'yes'),
            });
          } else if (args.topic.includes('requeststatus') && Number(args.content) > 100) {
            if (ApiHelper.checkRequestStatus(Number(args.content))) {
              this._loadingModal && this._loadingModal.hideLoadingPage();
              console.log(`requeststatus = ${Number(args.content)}, this.addRequest = ${this.addRequest}`);
              if (!this.addRequest) {
                const requestId = args.topic.slice(args.topic.indexOf('/') + 1, args.topic.lastIndexOf('/'));
                console.log(`++++++++++ requeststatus = ${Number(args.content)}, this.addRequest = ${this.addRequest}, requestId = ${requestId}`);
                this._timeoutID = setTimeout(() => {
                  if (this.requestList.length > 0 && this.requestList[this.requestList.length - 1].id === requestId) {
                    this.requestList[this.requestList.length - 1].status = Number(args.content);
                    this.props.actions.requestOrdersEdit(this.requestList);
                    if (this.props.accountType === 'admin') {
                      Actions.pop();
                    } else {
                      Actions.Dashboard({ type: 'reset' });
                    }
                  }
                }, 200);
              }
            } else {
              this._loadingModal && this._loadingModal.hideLoadingPage();
              this._timeoutID = setTimeout(() => {
                if (Number(args.content) === 102 || Number(args.content) === 109 || Number(args.content) === 111 || Number(args.content) === 112) {
                  console.log(`MQTT args.content = ${args.content}`);
                  this.handleServerError(Number(args.content));
                }
                // Alert.alert(strings.error_title, strings.error_request_not_create);
              }, 200);
            }
          } else if (args.topic.includes('realtime_info')) {
            if (args.content.length > 0) {
              try {
                const carId = args.topic.slice(args.topic.indexOf('/') + 1, args.topic.lastIndexOf('/'));
                const carsP = [].concat(this.state.carsPosition);
                const index = carsP.findIndex(value => value.id === carId);
                const carInfo = JSON.parse(args.content);
                let x = 0;
                let y = 0;
                if (Number(carInfo.cur_x) > 0 && Number(carInfo.cur_y) > 0) {
                  x = Number(carInfo.cur_x);
                  y = Number(carInfo.cur_y);
                } else {
                  x = Number(this.props.stopPoints[0].x);
                  y = Number(this.props.stopPoints[0].y);
                }
                console.log(`renderMap cur_x = ${carInfo.cur_x}, carInfo.cur_y=${carInfo.cur_y}`);
                console.log(`renderMap x = ${this.props.stopPoints[2].x}, y=${this.props.stopPoints[2].y}, carsP=${JSON.stringify(carsP)}`);
                if (index > -1) {
                  if (carsP[index].latitude !== x || carsP[index].longitude !== y) {
                    carsP[index].latitude = x;
                    carsP[index].longitude = y;
                    this.setState({ carsPosition: carsP });
                  }
                } else {
                  const data = { id: carId, latitude: x, longitude: y };
                  carsP.push(data);
                  this.setState({ carsPosition: carsP });
                }
              } catch (e) {
                console.log(e);
              }
            }
          }
        }
      }
    );

    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    console.log('componentWillUnmount MainPage');
    this._mqttId && NativeAppEventEmitter.removeSubscription(this._mqttId);
    this._timeoutID && clearTimeout(this._timeoutID);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _mapView: MapView;
  _timePicker: ?DateTimePicker;
  _timeoutID: ?any;
  _mqttId: any;
  showPickTime: boolean;
  _pointsPicker: ?PointsModal;
  _loadingModal: ?LoadingModal;
  requestList: Array<RequestOrder>;
  preConnectState: string;
  eulaModal: ?EULAModal;

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
        this.getOperationStatus();
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
      console.log(`getStopPointsFromServer fail error content.error = ${content.error}`);
      const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(content.error) > 900 && Number(content.error) < 905) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  _queryRequest = () => {
    let request = `${MQTT_REQ.MQTT_REQUEST_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    this.props.requestOrders.forEach((data) => {
      console.log(`MyRequest renderList data.status = ${data.status}`);
      if (ApiHelper.checkRequestStatus(data.status)) {
        request = `${MQTT_REQ.MQTT_REQUEST_TOPIC}${data.id}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
        NativeMqtt.subscribe(request, 2);
      }
    });
  }


  getOperationStatus = () => {
    const admin = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    NativeMqtt.subscribe(admin, 2);
    const car = `${MQTT_REQ.MQTT_CAR_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    NativeMqtt.subscribe(car, 2);
  }

  _onCheckChanged = check => this.setState({ shareCheck: check });
  setPassenger = () => {
    let { passenger } = this.state;

    console.log(`setPassenger passenger: ${this.state.passenger}`);
    if (passenger < 3) {
      ++passenger;
    } else {
      passenger = 1;
    }

    console.log(`setPassenger passenger: ${passenger}`);
    this.setState({ passenger });
  }

  findRegion = (locationArr: Array<{ latitude: number, longitude: number }>) => {
    const bounds = {
      left: Number.MAX_SAFE_INTEGER,
      top: -Number.MAX_SAFE_INTEGER,
      right: -Number.MAX_SAFE_INTEGER,
      bottom: Number.MAX_SAFE_INTEGER,
    };

    for (let i = 0; i < locationArr.length; ++i) {
      const r = locationArr[i];
      bounds.left = bounds.left > r.longitude ? r.longitude : bounds.left;
      bounds.top = bounds.top < r.latitude ? r.latitude : bounds.top;
      bounds.right = bounds.right < r.longitude ? r.longitude : bounds.right;
      bounds.bottom = bounds.bottom > r.latitude ? r.latitude : bounds.bottom;
    }

    const regionCenter = {
      longitude: (bounds.right + bounds.left) / 2,
      latitude: (bounds.top + bounds.bottom) / 2,
    };
    const latitudeDelta = (Math.abs(bounds.top - bounds.bottom)) * 1.5;
    const longitudeDelta = (Math.abs(bounds.left - bounds.right)) * 1.5;

    return {
      latitude: regionCenter.latitude,
      longitude: regionCenter.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  }

  _handleRegionAndAnimate = () => {
    const points = this.props.stopPoints;
    if (points.length > 0) {
      this._timeoutID = setTimeout(() => {
        this._mapView && this._mapView.animateToBearing(335);
      }, 200);
    }
  }

  onMapReady = () => {
    InteractionManager.runAfterInteractions(() => {
      // this._handleRegionAndAnimate();
    });
  }

  selectPoint = (value: number, point: string) => {
    console.log(`selectPoint value = ${value}, point = ${point}`);
    if (value === 0) {
      this.setState({ startPoint: point });
    } else {
      this.setState({ endPoint: point });
    }
    this.onMapReady();
  }

  checkAgreed = (agreed: boolean) => {
    this.props.actions.agreeNoticeEdit(agreed);
    if (agreed) {
      this.sendRequest();
    }
  }

  checkShowNotice = (isRest: boolean) => {
    if (isRest) {
      Alert.alert(`${strings.error_title}`, `${strings.error_rest_content}`);
      return;
    }
    if (this.props.agreeNotice) {
      this.sendRequest();
    } else {
      this.eulaModal && this.eulaModal.show();
    }
  }

  sendRequest = async () => {
    if (this.state.startPoint.length < 1) {
      Alert.alert(strings.error_title, strings.error_start_point);
      return;
    }
    if (this.state.endPoint.length < 1) {
      Alert.alert(strings.error_title, strings.error_end_point);
      return;
    }
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken, accountEmail } = this.props;
    const { content } = await RequestHelper.getResponse(
      `${RequestHelper.getServiceURL(RequestHelper.SERVER_REQUEST)}/create`,
      'POST',
      JSON.stringify({
        start: this.state.startPoint,
        end: this.state.endPoint,
        people: this.state.passenger,
        takearide: (this.state.shareCheck) ? 'yes' : 'no',
        email: accountEmail,
        token: accessToken,
      })
    );
    if (content.status) {
      console.log(`sendRequest success StopsInfo = ${JSON.stringify(content)}, request_ID: ${content.request_ID}`);
      this.requestList = [].concat(this.props.requestOrders);
      const request = {
        id: content.request_ID,
        start: this.state.startPoint,
        end: this.state.endPoint,
        passenger: this.state.passenger,
        takearide: this.state.shareCheck,
        status: 100,
        arrivaltime: 0,
        carid: '',
      };
      this.requestList.push(request);
      this.addRequest = false;
      const requestCmd = `${MQTT_REQ.MQTT_REQUEST_TOPIC}${content.request_ID}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
      NativeMqtt.subscribe(requestCmd, 2);
    } else {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      console.log(`sendRequest fail error content = ${JSON.stringify(content)}`);
      const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
      this.handleServerError(errorCode);
      if (Number(content.error) > 900 && Number(content.error) < 905) {
        RequestHelper.handleLogout(this.props.actions);
      }
    }
  }

  _logOut = async () => {
    const { accessToken, accountEmail } = this.props;
    console.log(`logout accessToken: ${accessToken}, accountEmail: ${accountEmail}`);
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
    this._timeoutID = setTimeout(() => {
      if (content.status) {
        console.log(`_logOut success content = ${JSON.stringify(content)}`);
        RequestHelper.handleLogout(this.props.actions);
      } else {
        console.log(`_logOut fail error msg = ${content.error}`);
        if (Number(content.error) > 900 && Number(content.error) < 905) {
          RequestHelper.handleLogout(this.props.actions);
        } else {
          const errorCode = (typeof content.error === 'undefined') ? RequestHelper.errorCode.INTERNAL_ERROR : Number(content.error);
          this.handleServerError(errorCode);
        }
      }
    }, 200);
  }

  renderMarker = (name: string) => {
    if (name === this.state.startPoint) {
      return (
        <View style={styles.markerConatiner}>
          <ImageBackground
            style={styles.focusMarker}
            imageStyle={{ tintColor: 'rgb(26, 206, 180)' }}
            source={ic_location}
            onLoad={() => this.forceUpdate()}
          >
            <Text style={{ width:0, height:0 }}>{Math.random()}</Text>
            <Text style={styles.focusMarkName}>{name.toUpperCase()}</Text>
          </ImageBackground>
        </View>
      );
    } else if (name === this.state.endPoint) {
      return (
        <View style={styles.markerConatiner}>
          <ImageBackground
            style={styles.focusMarker}
            imageStyle={{ tintColor: 'rgb(211, 19, 19)' }}
            source={ic_location}
            onLoad={() => this.forceUpdate()}
          >
            <Text style={{ width:0, height:0 }}>{Math.random()}</Text>
            <Text style={styles.focusMarkName}>{name.toUpperCase()}</Text>
          </ImageBackground>
        </View>
      );
    }

    return (
      <View style={styles.markerConatiner}>
        <ImageBackground
          style={styles.mapMarker}
          imageStyle={{ tintColor: 'rgb(77, 95, 228)' }}
          source={ic_location}
          onLoad={() => this.forceUpdate()}
        >
          <Text style={{ width:0, height:0 }}>{Math.random()}</Text>
          <Text style={styles.markName}>{name.toUpperCase()}</Text>
        </ImageBackground>
      </View>
    );
  }

  renderMapView = () => {
    const points = this.props.stopPoints;
    let region = {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    };
    if (points.length > 0) {
      const tPoints = [];
      for (let i = 0; i < points.length; ++i) {
        if (points[i].name !== 'garage') {
          const data = {
            latitude: Number(points[i].x),
            longitude: Number(points[i].y),
          };
          tPoints.push(data);
        }
      }
      region = this.findRegion(tPoints);
    }
    console.log(`renderMap this.state.carsPosition = ${JSON.stringify(this.state.carsPosition)}`);

    return (
      <View style={{ height: MAPVIEWHEIGHT }}>
        <MapView
          style={styles.map}
          ref={(c) => { this._mapView = c; }}
          mapType={MapView.MAP_TYPES.STANDARD}
          showsCompass={false}
          scrollEnabled={false}
          zoomEnabled={false}
          loadingEnabled={true}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          region={region}
          onMapReady={this.onMapReady}
        >
          { points.map((data, index) => (
            <MapView.Marker
              key={`point-${String(index)}`}
              coordinate={{ latitude: Number(data.x), longitude: Number(data.y) }}
              onPress={() => this._pointsPicker && this._pointsPicker.show(data.name)}
            >
              {this.renderMarker(data.name)}
            </MapView.Marker>))
          }
          {this.state.carsPosition.map((data, index) => (
            <MapView.Marker
              key={`car-${String(index)}`}
              coordinate={{ latitude: data.latitude, longitude: data.longitude }}
            >
              <View style={{
                 width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgb(48, 184, 249)'
                }}
              />
            </MapView.Marker>
            ))
          }
        </MapView>
      </View>
    );
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

  render() {
    const Touchable = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    const isRest = (this.state.admins.findIndex(item => Number(item.status) > 50) === -1 || !(this.state.systemStatus));
    const strOperation = (isRest) ? strings.rest : strings.normal_operation;

    return (
      <View style={styles.container}>
        {this.renderMapView()}
        <View style={styles.carStateArea}>
          <Text style={styles.carStateText}>{strOperation}</Text>
        </View>
        <View style={styles.pickArea}>
          {this.showPickTime &&
            <View style={styles.pickView}>
              <Text style={[styles.pickTitleText, { marginBottom: 12 }]}>{strings.share_car}</Text>
              <Checkbox
                checked={this.state.shareCheck}
                onChecked={this._onCheckChanged}
                size={26}
              />
            </View>}
          {this.showPickTime && <View style={styles.divView} />}
          {this.showPickTime &&
            <Touchable
              onPress={() => { this._timePicker && this._timePicker.openPicker(); }}
            >
              <View style={styles.pickView}>
                <Text style={styles.pickTitleText}>{strings.pick_up}</Text>
                <Text style={styles.pickContentText}>
                  {FormatHelper.simpleDateFormat(this.state.pickupTime, FormatHelper.DATE_FORMAT_TYPE.HHmm)}
                </Text>
              </View>
            </Touchable>}
          {this.showPickTime && <View style={styles.divView} />}
          <Touchable
            onPress={() => { this.setPassenger(); }}
          >
            <View style={styles.pickView}>
              <Text style={styles.pickTitleText}>{strings.passenger}</Text>
              <Text
                style={styles.pickContentText}
              >{this.state.passenger}
              </Text>
            </View>
          </Touchable>
        </View>
        <BarBtn
          title={strings.send_request.toUpperCase()}
          bgColor="rgb(48, 184, 249)"
          containerStyle={styles.btnContainer}
          onPress={() => { this.checkShowNotice(isRest); }}
        />
        {this.showPickTime && <DateTimePicker
          ref={(c) => { this._timePicker = c; }}
          value={this.state.pickupTime}
          onSelected={(value, pickupTime) => { this.setState({ pickupTime }); }}
          mode="time"
        />}
        <PointsModal
          ref={(c) => { this._pointsPicker = c; }}
          onPress={(value, point) => { this.selectPoint(value, point); }}
        />
        <LoadingModal ref={(c) => { this._loadingModal = c; }} />
        <EULAModal
          ref={(c) => { this.eulaModal = c; }}
          isNotice={true}
          onAgreed={(agreed) => { this.checkAgreed(agreed); }}
        />
        {this._renderDroupDownMenu()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapMarker: {
    width: 22,
    height: MARKER_SIZE,
    alignItems: 'center',
  },
  focusMarker: {
    width: 32,
    height: 40,
    alignItems: 'center',
  },
  markerConatiner: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  markName: {
    color: '#fff',
    fontSize: 12,
    ...Platform.select({
      android: { fontFamily: 'sans-serif-black', marginTop: 3 },
      ios: { marginTop: 4 }
    }),
  },
  focusMarkName: {
    color: '#fff',
    fontSize: 18,
    ...Platform.select({
      android: { fontFamily: 'sans-serif-black', marginTop: 4 },
      ios: { marginTop: 6 }
    }),
  },
  btnContainer: {
    left: 0,
    bottom: 0,
    width: deviceWidth,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickArea: {
    width: deviceWidth,
    height: 88,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  carStateText: {
    backgroundColor: '#fff',
    color: 'rgb(48, 184, 249)',
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  carStateArea: {
    width: deviceWidth,
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickView: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        flex: 1,
      },
      ios: {
        width: (deviceWidth - 1.1) / 2,
      }
    }),
  },
  divView: {
    width: 1.1,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  pickTitleText: {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.54)',
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    marginBottom: 8,
  },
  pickContentText: {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 28,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
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
});

function select(store) {
  return {
    stopPoints: store.settings.stopPoints,
    requestOrders: store.settings.requestOrders,
    accountEmail: store.settings.accountEmail,
    accessToken: store.settings.accessToken,
    agreeNotice: store.settings.agreeNotice,
    accountType: store.settings.accountType,
  };
}

module.exports = connect(
  select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  })
)(MainPage);
