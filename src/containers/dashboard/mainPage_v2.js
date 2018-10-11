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
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import MapView, { PROVIDER_GOOGLE, Polyline, Coordinate } from 'react-native-maps';
import { ifIphoneX } from 'react-native-iphone-x-helper';
import Geocoder from 'react-native-geocoder';
import Permissions from 'react-native-permissions';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  PlaySound
} from 'react-native-play-sound';
import * as reduxActions from '../../actions';
import type { StopPoint, RequestOrder } from '../../reducers/settings';
import {
  BarBtn, DateTimePicker, LoadingModal, BasicController, EULAModal
} from '../../components';
import { NativeMqtt, MQTT_REQ } from '../mqtt';
import {
  ic_location,
  ic_back,
  ic_menu,
  ic_end_station,
  ic_start_station,
  person_one,
  person_two,
  person_three,
  ic_car_left,
  ic_car_right,
} from '../../components/img';
import PointsModal from './pointsModal';
import RequestHelper from '../../utils/requestHelper';
import theme from '../../utils/basicStyle';
import { ApiHelper_V2 } from '../../utils/apiHelper';
import {
  carRoutePoints,
  carStopPoints,
  intersection,
} from './cusConstants';

const strings = require('@strings');

const {
  width: deviceWidth,
  height: deviceHeight,
} = Dimensions.get('window');

const MARKER_SIZE = 28;
const TOOLBAR_HEIGHT = (Platform.OS === 'ios') ? 64 : 56;
const VIEW_AREA = 0;
const MAPVIEWHEIGHT = deviceHeight - TOOLBAR_HEIGHT - VIEW_AREA;
const AspireParkPoints = carStopPoints;
const AspireRoutePoints = carRoutePoints;
const shortTimeOut = 300;
const stepRest = 0;
const stepOne = 1;
const stepTwo = 2;
const stepThree = 3;
const stepFour = 4;
const mqtt_debug = false;
const inaccuracy = 0.001;
// you can customize these two values based on your needs
const radiusInKM = 1;
const earthRadiusInKM = 6371;
const aspectRatio = 1;
const radiusInRad = radiusInKM / earthRadiusInKM;
const MINI_LAT_BOUNDARY = 24.832827;
const MAX_LAT_BOUNDARY = 24.845788;
const MINI_LONG_BOUNDARY = 121.178700;
const MAX_LONG_BOUNDARY = 121.193800;
const INIT_MAP_CENTER_LAT = 24.84027049;
const INIT_MAP_CENTER_LNG = 121.1825798;
const initialRegion = {
  latitude: INIT_MAP_CENTER_LAT,
  longitude: INIT_MAP_CENTER_LNG,
  latitudeDelta: aspectRatio * radiusInRad * 57.29577951308232,
  longitudeDelta: (radiusInRad / Math.cos((INIT_MAP_CENTER_LAT * Math.PI) / 180)) * 57.29577951308232,
};
const delayMoveSeconds = Platform.OS === 'android' ? 200 : 500;
const confirmBtnSpaceRatio = Platform.OS === 'android' ? 0.1 : 0.2;

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
  admins: Array<{ id: string, status: string }>,
  // startPoint: string,
  // endPoint: string,
  openMenu: boolean,
  systemStatus: boolean,  // v1 variable, v2 not assigned
  carsPosition: Array<{ id: string, latitude: number, longitude: number }>,
  endStation: { latitude: number, longitude: number },
  startStation: { latitude: number, longitude: number },
  // userPosition: { latitude: number, longitude: number },
  touchPosition: { latitude: number, longitude: number },
  address: string,
  addressPosition: { latitude: number, longitude: number },
  locationPermission: object,
  isMapReady: boolean,
  flex: number,
  mapRegion: {
    latitude: number,
    longitude: number,
    latitudeDelta: number,
    longitudeDelta: number
  },
  step: number,
  routeCoords: null,
  buttonStatus: boolean
}

class MainPage_v2 extends BasicController<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      shareCheck: true,
      pickupTime: new Date(),
      passenger: 1,
      admins: [],
      // startPoint: '',
      // endPoint: '',
      openMenu: false,
      systemStatus: false,
      carsPosition: [],
      endStation: { latitude: 0, longitude: 0 },
      startStation: { latitude: 0, longitude: 0 },
      // userPosition: { latitude: 0, longitude: 0 },
      touchPosition: { latitude: 0, longitude: 0 },
      address: '',
      addressPosition: { latitude: 0, longitude: 0 },
      locationPermission: [],
      isMapReady: false,
      flex: 0,
      // mapRegion: {
      //   latitude: INIT_MAP_CENTER_LAT,
      //   longitude: INIT_MAP_CENTER_LNG,
      //   latitudeDelta: aspectRatio * this.rad2deg(radiusInRad),
      //   longitudeDelta: this.rad2deg(radiusInRad / Math.cos(this.toRad(INIT_MAP_CENTER_LAT)))
      // },
      step: 0,
      routeCoords: AspireRoutePoints,
      buttonStatus: false,
    };
    this.showPickTime = false;
    this.closeMenu = this.closeMenu.bind(this);
    this.openMenu = this.openMenu.bind(this);
    this.requestList = [];
    this.preConnectState = 'disconnected';
    this.addRequest = this.props.add || false;
    this.currentMapRegion = initialRegion;
    this.mapMoving = false;
    this.checkStepsFlag = false;
  }

  closeMenu: () => void;

  openMenu: () => void;

  prefocus2Station = { latitude: 0, longitude: 0 };

  prefocus2startStation = { latitude: 0, longitude: 0 };

  prefocus2endStation = { latitude: 0, longitude: 0 };

  userPosition = { latitude: 0, longitude: 0 };

  addRequest: boolean;

  watchID: any;

  _mapView: MapView;

  currentMapRegion: any;

  currentSkipMapRegion = null;

  _timePicker: ?DateTimePicker;

  _timeoutID: ?any;

  _mqttId: any;

  showPickTime: boolean;

  _pointsPicker: ?PointsModal;

  _loadingModal: ?LoadingModal;

  requestList: [Array<RequestOrder>];

  preConnectState: string;

  eulaModal: ?EULAModal;

  mapMoving: boolean;

  animationTimeout_2Station: any;

  animationTimeout: any;

  animationTimeout_End: any;

  checkStepsFlag: boolean;

  onMapLayout = () => {
    console.log(`onMapLayout isMapReady ${this.state.isMapReady} this.state.step ${this.state.step}`);
    this._mapView.setMapBoundaries({ latitude: MAX_LAT_BOUNDARY, longitude: MINI_LONG_BOUNDARY }, { latitude: MINI_LAT_BOUNDARY, longitude: MAX_LONG_BOUNDARY });
    this.setState({ isMapReady: true }, function () {
      console.log('Map ready~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      if (this.state.step === stepRest || this.state.step === stepOne) {
        setTimeout(() => {
          this.checkStartStationInMapCenter2();
        }, 2000);
      }
    });
  }

  async componentWillMount() {
    console.log('-----------------componentWillMount mainPage_V2-----------------');
    // const titleStr = (this.props.enterVersionTwo_pro) ? `${strings.app_name}` : `${strings.app_name} (D)`;
    const titleStr = strings.rest;
    if (this.props.showMenu) {
      Actions.refresh({
        hideNavBar: false,
        navigationBarStyle: theme.router.navbarStyle,
        title: titleStr,
        rightButtonImage: ic_menu,
        rightButtonIconStyle: { paddingRight: 14, width: 24, height: 24 },
        leftButtonIconStyle: { paddingLeft: 14, width: 24, height: 24 },
        leftButtonImage: ic_back,
        onRight: this.openMenu,
        onLeft: this._onBackClick,
        rightTitle: null
      });
    } else {
      Actions.refresh({
        hideNavBar: false,
        navigationBarStyle: theme.router.navbarStyle,
        title: strings.request,
        backButtonImage: ic_back,
        leftButtonIconStyle: { paddingLeft: 14, width: 24, height: 24 },
        onLeft: Actions.pop,
        rightButtonImage: null,
        rightButtonIconStyle: null,
        onRight: null,
        rightTitle: null
      });
    }
    this._queryRequest();
    this.getOperationStatus();
  }

  _onBackClick = () => {
    console.log('onBack');
    const { step } = this.state;
    const data = {
      latitude: 0,
      longitude: 0
    };
    if (step === stepFour) {
      this.setState({
        step: step - 1,
        passenger: 1,
      }, function () { this.checkTitleStatus(); } );
    } else if (step === stepThree) {
      this.setState({
        step: step - 1,
        endStation: data,
        passenger: 1,
      }, function () { this.checkTitleStatus(); } );
    } else if (step === stepTwo) {
      this.setState({
        step: step - 1,
        startStation: data,
      }, function () { this.checkTitleStatus(); });
    } else if (step === stepRest || step === stepOne) {
      // RequestHelper.handleLogout(this.props.actions);
      this._logOut();
    } else {
      console.log('Error step');
      // this.setState({
      //   step: step - 1,
      // }, function () { this.checkTitleStatus(); });
    }
    return true;
  }

  componentDidMount() {
    console.log('-----------------componentDidMount mainPage_V2-----------------');
    setTimeout(() => this.setState({ flex: 1 }), 100);
    this._mqttId = NativeAppEventEmitter.addListener(
      MQTT_REQ.EVENTNAME_MQTT_MESSAGE_EVENT,
      (args) => {
        if (mqtt_debug) console.log(args);
        // const logmsg = `${JSON.stringify(args)}`;
        // console.log(`MQTT logmsg = ${JSON.stringify(logmsg)}`);
        if (args.title === 'connect') {
          if (args.content !== this.preConnectState && args.content === 'connected') {
            this._queryRequest();
            this.getOperationStatus();
          }
          this.preConnectState = args.content;
        } else {
          if (args.topic.includes(MQTT_REQ.MQTT_REQUEST_TOPIC) && args.topic.includes(MQTT_REQ.REQ_INFO)) {
            const content = JSON.parse(args.content);
            if (ApiHelper_V2.checkRequestStatus(Number(content.status))) {
              this._loadingModal && this._loadingModal.hideLoadingPage();
              console.log(`requeststatus = ${Number(content.status)}, this.addRequest = ${this.addRequest}`);
              if (!this.addRequest) {
                const requestId = content.id;
                console.log(`++++++++++ requeststatus = ${Number(content.status)}, this.addRequest = ${this.addRequest}, requestId = ${requestId}`);
                this._timeoutID = setTimeout(() => {
                  if (this.requestList.length > 0 && this.requestList[this.requestList.length - 1].id === requestId) {
                    this.requestList[this.requestList.length - 1].status = Number(content.status);
                    this.props.actions.requestOrdersEdit(this.requestList);
                    if (this.props.accountType === 'admin') {
                      Actions.pop();
                    } else {
                      Actions.Dashboard(
                        {
                          type: 'reset',
                          onRight: null,
                          rightTitle: null,
                          rightButtonImage: null
                        }
                      );
                    }
                  }
                }, 200);
              }
            } else {
              this._loadingModal && this._loadingModal.hideLoadingPage();
              this._timeoutID = setTimeout(() => {
                if (Number(content.status) === Number(MQTT_REQ.REQ_DRIVE_CONFIRM_ERROR)) {
                  console.log(`MQTT args.content = ${content.mark}`);
                  this.handleServerError(Number(content.error_code));
                }
                Alert.alert(strings.error_title, strings.error_request_not_create);
              }, 200);
            }
          } else if (args.topic.includes(MQTT_REQ.MQTT_CAR_TOPIC) && args.topic.includes(MQTT_REQ.CAR_LOGS)) {
            if (args.content.length > 0) {
              try {
                const carInfo = JSON.parse(args.content);
                const carId = carInfo.carID;
                const carsP = [].concat(this.state.carsPosition);
                const index = carsP.findIndex(value => value.id === carId);
                let x = 0;
                let y = 0;
                if (Number(carInfo.cur_lat) > 0 && Number(carInfo.cur_lon) > 0) {
                  x = Number(carInfo.cur_lat);
                  y = Number(carInfo.cur_lon);
                }
                if (mqtt_debug) console.log(`renderMap cur_x = ${carInfo.cur_lat}, carInfo.cur_y=${carInfo.cur_lon}`);
                // console.log(`renderMap x = ${this.props.stopPoints[2].x}, y=${this.props.stopPoints[2].y}, carsP=${JSON.stringify(carsP)}`);
                if (index > -1) {
                  if (carsP[index].latitude !== x || carsP[index].longitude !== y) {
                    // The car is moving.
                    carsP[index].dir = this.checkCarDrivingDirection(carsP[index].latitude, carsP[index].longitude, x, y);
                    carsP[index].latitude = x;
                    carsP[index].longitude = y;
                    if (!this.mapMoving) {
                      this.setState({ carsPosition: carsP });
                    }
                  }
                } else {
                  // create car logs
                  const data = {
                    id: carId,
                    latitude: x,
                    longitude: y,
                    dir: ''
                  };
                  carsP.push(data);
                  if (!this.mapMoving) {
                    this.setState({ carsPosition: carsP });
                  }
                }
              } catch (e) {
                console.log(e);
              }
            }
          }
          else if (args.topic.includes(MQTT_REQ.MQTT_CAR_TOPIC) && args.topic.includes(MQTT_REQ.CAR_STATUS)) {
            if (args.content.length > 0) {
              try {
                const carStatus = JSON.parse(args.content);
                if (carStatus < Number(MQTT_REQ.REQ_DRIVE_CONFIRM_ERROR)) {
                  this.setState({ systemStatus: true });
                  if (carStatus === Number(MQTT_REQ.REQ_STATUS_WAIT_REPLY)) {
                    this.setState({ step: 1 }, function () { this.checkTitleStatus(); });
                  }
                } else {
                  const data = {
                    longitude: 0,
                    latitude: 0,
                  };
                  this.setState({
                    systemStatus: false,
                    step: 0,
                    endStation: data
                  }, function () { this.checkTitleStatus(); });
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

    Permissions.check('location').then((response) => {
      // Response is one of: 'authorized', 'denied', 'restricted', or 'undetermined'
      this.setState({ locationPermission: response });
      console.log('Location Permission: '.concat(response));
      if (response === 'authorized') {
        this.monitorLocation();
      } else {
        Alert.alert(
          strings.req_location_permission_title,
          strings.req_location_permission_content,
          [
            {
              text: strings.req_permission_denied,
              onPress: () => {
                console.log('Permission denied');
                this.findStation(this.userPosition, 0);
                console.log('componentDidMount unauthorized ---------------------------> focus2StartStation');
                this.checkStartStationInMapCenter();
              },
              style: strings.cancel,
            },
            {
              text: strings.ok,
              onPress: () => {
                Permissions.request('location').then((res) => {
                  this.setState({ locationPermission: res }, function () {
                    console.log('Location Permission: '.concat(res));
                    if (res === 'authorized') {
                      this.monitorLocation();
                    } else {
                      this.findStation(this.userPosition, 0);
                      console.log('componentDidMount unauthorized ---------------------------> focus2StartStation');
                      this.checkStartStationInMapCenter();
                    }
                  });
                });
              },
            }
          ],
        );
      }
    });
  }

  checkCarDrivingDirection = (pre_lat, pre_long, lat, long) => {
    if ((lat - pre_lat > 0) && (long - pre_long < 0)) {
      return 'left';
    } else if ((lat - pre_lat < 0) && (long - pre_long > 0)) {
      return 'right';
    } else if ((lat - pre_lat > 0) && (long - pre_long > 0)) {
      return 'left';
    } else if ((lat - pre_lat < 0) && (long - pre_long < 0)) {
      return 'right';
    } else {
      return 'right';
    }
  }

  focus2Station = (station) => {
    // console.log(`focus2StartStation isMapReady ${this.isMapReady} prefocus ${prefocus2startStation.latitude} ${prefocus2startStation.longitude} ---> ${this.state.startStation.latitude} ${this.state.startStation.longitude}`);
    if (!this.state.isMapReady) {
      console.log('Map not ready');
    } else {
      let playSoundFlag = true;
      const shouldMove = true;
      // Since new start station could be the same as the previous one, the center of the mapview need to be moved
      if (this.prefocus2Station.latitude === station.latitude && this.prefocus2Station.longitude === station.longitude) {
        console.log('focus2Station the same station');
        if (this.animationTimeout_2Station) {
          // clearTimeout(this.animationTimeout);
          // console.log(`focus2StartStation the same station: clearTimeout ${this.animationTimeout}`);
        }
        playSoundFlag = false;
        // shouldMove = false;
      }
      // } else {
      if (shouldMove) {
        this.prefocus2Station = station;
        // this.prefocus2Station.latitude = station.latitude;
        console.log('focus2Station ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        // this.prefocus2Station.longitude = station.longitude;
        this.animationTimeout_2Station = setTimeout(() => {
          if (this.state.step !== stepRest && playSoundFlag) PlaySound('toendstation');
          InteractionManager.runAfterInteractions(() => {
            this.focusMap([
              { latitude: station.latitude, longitude: station.longitude },
            ], false);
          });
        }, delayMoveSeconds);
        console.log(`focus2Station -------------> id ${this.animationTimeout_2Station} : ${station.latitude} ${station.longitude}`);
      }
      // }
    }
  }

  focus2StartStation() {
    // console.log(`focus2StartStation isMapReady ${this.isMapReady} prefocus ${prefocus2startStation.latitude} ${prefocus2startStation.longitude} ---> ${this.state.startStation.latitude} ${this.state.startStation.longitude}`);
    if (!this.state.isMapReady) {
      console.log('focus2StartStation Map not ready');
    }
    else
    if (this.state.startStation.latitude === 0 && this.state.startStation.longitude === 0) {}
    else {
      let playSoundFlag = true;
      const shouldMove = true;
      // Since new start station could be the same as the previous one, the center of the mapview need to be moved
      if (this.prefocus2startStation.latitude === this.state.startStation.latitude && this.prefocus2startStation.longitude === this.state.startStation.longitude) {
        console.log('focus2StartStation the same station');
        if (this.animationTimeout) {
          // clearTimeout(this.animationTimeout);
          // console.log(`focus2StartStation the same station: clearTimeout ${this.animationTimeout}`);
        }
        playSoundFlag = false;
        // shouldMove = false;
      }
      // } else {
      if (shouldMove) {
        this.prefocus2startStation.latitude = this.state.startStation.latitude;
        this.prefocus2startStation.longitude = this.state.startStation.longitude;
        this.animationTimeout = setTimeout(() => {
          if (this.state.step !== stepRest && playSoundFlag) PlaySound('toendstation');
          InteractionManager.runAfterInteractions(() => {
            this.focusMap([
              { latitude: this.state.startStation.latitude, longitude: this.state.startStation.longitude },
            ], false);
          });
        }, delayMoveSeconds);
        console.log(`focus2StartStation -------------> id ${this.animationTimeout} : ${this.state.startStation.latitude} ${this.state.startStation.longitude}`);
      }
      // }
    }
  }

  focus2EndStation() {
    console.log(`focus2EndStation ${this.animationTimeout_End}`);
    if (!this.state.isMapReady) {}
    else
    if (this.state.endStation.latitude === 0 && this.state.endStation.longitude === 0) {}
    else {
      let playSoundFlag = true;
      const shouldMove = true;
      if (this.prefocus2endStation.latitude === this.state.endStation.latitude && this.prefocus2endStation.longitude === this.state.endStation.longitude) {
        console.log('prefocus2endStation the same station');
        if (this.animationTimeout_End) {
          // clearTimeout(this.animationTimeout_End);
          // console.log(`focus2EndStation the same station: clearTimeout ${this.animationTimeout_End}`);
        }
        playSoundFlag = false;
        // shouldMove = false;
      }
      if (shouldMove) {
        this.prefocus2endStation.latitude = this.state.endStation.latitude;
        this.prefocus2endStation.longitude = this.state.endStation.longitude;
        this.animationTimeout_End = setTimeout(() => {
          if (this.state.step !== stepRest && playSoundFlag) PlaySound('toendstation');
          InteractionManager.runAfterInteractions(() => {
            this.focusMap([
              { latitude: this.state.endStation.latitude, longitude: this.state.endStation.longitude },
            ], false);
          }, delayMoveSeconds);
        });
        console.log(`focus2EndStation -------------> id ${this.animationTimeout_End} : ${this.state.endStation.latitude} ${this.state.endStation.longitude}`);
      }
    }
  }


  focusMap(markers, animated) {
    // console.log('Markers received to populate map!');
    this._mapView.fitToCoordinates(markers, animated);
  }

  monitorLocation = async () => {
    console.log(`monitorLocation ---------------------------------------------- user position: ${this.userPosition.latitude} ${this.userPosition.longitude}`);
    await navigator.geolocation.getCurrentPosition(
      (position) => {
        const initialPosition = {
          latitude: parseFloat(position.coords.latitude),
          longitude: parseFloat(position.coords.longitude)
        };
        console.log(`monitorLocation ------------------------------------------ getCurrentPosition: ${initialPosition.latitude} ${initialPosition.longitude}`);
        this.userPosition = initialPosition;
        // this.setState({
        //   userPosition: initialPosition
        // }, function () {
        this.findStation(initialPosition, 0);
        //   console.log('monitorLocation get current position');
        // });
        // console.log('monitorLocation ---------------------------> focus2StartStation');
        // this.focus2StartStation();
      },
      (error) => {
        console.log(`monitorLocation ----------------------------------------------- ${error}`);
        this.findStation(this.userPosition, 0);
        // console.log('monitorLocation ---------------------------> focus2StartStation');
        // this.focus2StartStation();
      },
      {
        enableHighAccuracy:true,
        timeout: 20000,
      }
    );
    this.watchID = await navigator.geolocation.watchPosition((position) => {
      const lastPosition = {
        latitude: parseFloat(position.coords.latitude),
        longitude: parseFloat(position.coords.longitude)
      };
      // potential issue
      // this.setState({
      //   userPosition: lastPosition
      // });
      this.userPosition = lastPosition;
      // Alert.alert('GPS', JSON.stringify(position));
      // this.findStation(this.userPosition, 0);
    }, (error) => { console.log(error); },
    {
      enableHighAccuracy: true, distanceFilter: 1, timeout: 20000, maximumAge:0
    });
  }

  componentWillUnmount() {
    console.log('--------------componentWillUnmount MainPage_v2----------------');
    this._mqttId && NativeAppEventEmitter.removeSubscription(this._mqttId);
    this._timeoutID && clearTimeout(this._timeoutID);
    AppState.removeEventListener('change', this._handleAppStateChange);
    navigator.geolocation.clearWatch(this.watchID);
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    if (this.animationTimeout_End) {
      clearTimeout(this.animationTimeout_End);
    }
    this.setState({ isMapReady: false });
    this.prefocus2startStation.latitude = 0;
    this.prefocus2startStation.longitude = 0;
  }

  openMenu(): void {
    this.setState({ openMenu: true });
  }

  closeMenu(): void {
    this.setState({ openMenu: false });
  }

  _handleAppStateChange = async (nextAppState) => {
    console.log(`handleAppStateChange ${nextAppState}`);
    if (nextAppState === 'active') {
      // do something when app active
      // await this.getStopPointsFromServer();
      if (Platform.OS === 'ios') {
        this._queryRequest();
        this.getOperationStatus();
      }
    }
  }

  getStopPointsFromServer = async () => {
    const { accessToken } = this.props;
    const { content } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_USER_INFO) : RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_USER_INFO),
      'GET',
      '',
      { 'content-type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    );
    if (content) {
      console.log(content);
      // let list = [];
      // list = list.concat(content.points);
      // this.props.actions.stopPointsEdit(list);
      // console.log(`getStopPointsFromServer success list = ${JSON.stringify(list)}`);
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
    let request = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_REQUEST_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    this.props.requestOrders.forEach((data) => {
      console.log(`MyRequest_v2 renderList data.status = ${data.status}`);
      if (ApiHelper_V2.checkRequestStatus(data.status)) {
        request = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_REQUEST_TOPIC}${data.id}/${MQTT_REQ.REQ_INFO}`;
        NativeMqtt.subscribe(request, 1);
      }
    });
  }


  getOperationStatus = () => {
    // const admin = `${MQTT_REQ.MQTT_REQUEST_ADMIN}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    // NativeMqtt.subscribe(admin, 2);
    const car = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_CAR_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    NativeMqtt.subscribe(car, 1);
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

  // showRegion(locationCoords) {
  //   if (locationCoords && locationCoords.latitude && locationCoords.longitude) {
  //     // const radiusInRad = radiusInKM / earthRadiusInKM;
  //     const lonDelta = this.rad2deg(radiusInRad / Math.cos(this.toRad(locationCoords.latitude)));
  //     const latDelta = aspectRatio * this.rad2deg(radiusInRad);

  //     this.setState({
  //       mapRegion: {
  //         latitude: locationCoords.latitude,
  //         longitude: locationCoords.longitude,
  //         latitudeDelta: latDelta,
  //         longitudeDelta: lonDelta
  //       }
  //     });
  //   }
  // }

  /* findRegion = (locationArr: Array<{ latitude: number, longitude: number }>) => {
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
      // longitude: (bounds.right + bounds.left) / 2,
      // latitude: (bounds.top + bounds.bottom) / 2,
      longitude: (MAX_LONG_BOUNDARY + MINI_LONG_BOUNDARY) / 2,
      latitude: ((MAX_LAT_BOUNDARY + MINI_LAT_BOUNDARY) / 2) + 0.00045,
    };

    // const latitudeDelta = (Math.abs(bounds.top - bounds.bottom)) * 1.5;
    // const longitudeDelta = (Math.abs(bounds.left - bounds.right)) * 1.5;

    const radiusInRad = radiusInKM / earthRadiusInKM;
    const latitudeDelta = aspectRatio * this.rad2deg(radiusInRad);
    const longitudeDelta = this.rad2deg(radiusInRad / Math.cos(this.toRad(regionCenter.latitude)));

    console.log(`findRegion regionCenter: long ${regionCenter.longitude} lat ${regionCenter.latitude}, deltalon ${longitudeDelta} deltalati ${latitudeDelta}`);

    return {
      latitude: regionCenter.latitude,
      longitude: regionCenter.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  } */

  _handleRegionAndAnimate = () => {
    const points = this.props.stopPoints;
    if (points.length > 0) {
      this._timeoutID = setTimeout(() => {
        this._mapView && this._mapView.animateToBearing(335);
      }, 200);
    }
  }

  onMapReady = () => {
    console.log('onMapReady');
    InteractionManager.runAfterInteractions(() => {
      // this._handleRegionAndAnimate();
    });
  }

  // selectPoint = (value: number, point: string) => {
  //   console.log(`selectPoint value = ${value}, point = ${point}`);
  //   if (value === 0) {
  //     this.setState({ startPoint: point });
  //   } else {
  //     this.setState({ endPoint: point });
  //   }
  //   // this.onMapReady();
  // }

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
    if (this.state.startStation.latitude === 0) {
      Alert.alert(strings.error_title, strings.error_start_point);
      return;
    }
    if (this.state.endStation.latitude === 0) {
      Alert.alert(strings.error_title, strings.error_end_point);
      return;
    }
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken } = this.props;
    const { errorCode, errorMessage, content } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? `${RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_REQUEST_ORDER)}` : `${RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_REQUEST_ORDER)}`,
      'POST',
      JSON.stringify({
        areaId: '1',
        gps_start_lat: this.state.startStation.latitude.toString(),
        gps_start_lon: this.state.startStation.longitude.toString(),
        gps_end_lat: this.state.endStation.latitude.toString(),
        gps_end_lon: this.state.endStation.longitude.toString(),
        people: this.state.passenger,
      }),
      { 'content-type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    );
    if (errorCode === RequestHelper.errorCode.NO_ERROR) {
      console.log(`sendRequest success request_ID: ${content.request_id}`);
      this.requestList = [].concat(this.props.requestOrders);
      const request = {
        id: content.request_id,
        start_lat: this.state.startStation.latitude.toString(),
        start_long: this.state.startStation.longitude.toString(),
        end_lat: this.state.endStation.latitude.toString(),
        end_long: this.state.endStation.longitude.toString(),
        passenger: this.state.passenger,
        // takearide: this.state.shareCheck,
        status: 100,
        arrivaltime: 0,
        carid: 0,
      };
      this.requestList.push(request);
      this.addRequest = false;
      const requestCmd = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_REQUEST_TOPIC}${content.request_id}/info`;
      NativeMqtt.subscribe(requestCmd, 1);
    } else {
      this._loadingModal && this._loadingModal.hideLoadingPage();
      console.log(`sendRequest fail error content = ${errorMessage}`);
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

  renderMarker = (name: string) => {
    if (name === 'start') {
      return (
        <View style={styles.markerConatiner}>
          <ImageBackground
            style={styles.focusMarker}
            source={ic_start_station}
            onLoad={() => this.forceUpdate()}
          >
            <Text style={{ width: 0, height: 0 }}>
              {Math.random()}
            </Text>
          </ImageBackground>
        </View>
      );
    } else if (name === 'end') {
      return (
        <View style={styles.markerConatiner}>
          <ImageBackground
            style={styles.focusMarker}
            source={ic_end_station}
            onLoad={() => this.forceUpdate()}
          >
            <Text style={{ width: 0, height: 0 }}>
              {Math.random()}
            </Text>
          </ImageBackground>
        </View>
      );
    } else if (name === 'car_left') {
      return (
        <View style={styles.markerConatiner}>
          <ImageBackground
            style={styles.carMarker}
            source={ic_car_left}
            onLoad={() => this.forceUpdate()}
          >
            <Text style={{ width: 0, height: 0 }}>
              {Math.random()}
            </Text>
          </ImageBackground>
        </View>
      );
    } else if (name === 'car_right') {
      return (
        <View style={styles.markerConatiner}>
          <ImageBackground
            style={styles.carMarker}
            source={ic_car_right}
            onLoad={() => this.forceUpdate()}
          >
            <Text style={{ width: 0, height: 0 }}>
              {Math.random()}
            </Text>
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
          <Text style={{ width: 0, height: 0 }}>
            {Math.random()}
          </Text>
          <Text style={styles.markName}>
            {name.toUpperCase()}
          </Text>
        </ImageBackground>
      </View>
    );
  }

  _moveMap = (e) => {
    // console.log('_moveMap', e);
    console.log('_moveMap');
    this.mapMoving = true;
  }

  calculateDistance = (lat1: number, lat2: number, long1: number, long2: number) => {
    const p = 0.017453292519943295;    // Math.PI / 180
    const c = Math.cos;
    const a = 0.5 - c((lat1 - lat2) * p) / 2 + c(lat2 * p) * c((lat1) * p) * (1 - c(((long1 - long2) * p))) / 2;
    const dis = (12742 * Math.asin(Math.sqrt(a))); // 2 * R; R = 6371 km
    return dis;
  }

  _moveMapComplete = (e) => {
    console.log(`_moveMapComplete checkStepsFlag ${this.checkStepsFlag}, startPos = ${this.state.startStation.latitude} ${this.state.startStation.longitude}, currentMapRegion = ${this.currentMapRegion.latitude} ${this.currentMapRegion.longitude}, new center = ${e.latitude} ${e.longitude}`);
    const distance = this.calculateDistance(e.latitude, this.currentMapRegion.latitude, e.longitude, this.currentMapRegion.longitude);
    console.log(`                 distance: ${distance}`);
    const deltaDistance = Platform.OS === 'android' ? 0.003 : 0.02;
    if (distance > deltaDistance) {
      this.currentMapRegion = e;
      this.currentSkipMapRegion = null;
    } else {
      console.log(`                 below ${deltaDistance}, skip`);
      this.currentSkipMapRegion = e;
    }
    this.mapMoving = false;
    if (this.checkStepsFlag) {
      this.confirmAlert();
    }
  }

  _longTouch = (coordinate) => {
    const data = {
      longitude: 0,
      latitude: 0,
    };
    data.longitude = coordinate.longitude;
    data.latitude = coordinate.latitude;
    this.setState({
      touchPosition: data,
    });
  }

  calcCrow = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const tlat1 = this.toRad(lat1);
    const tlat2 = this.toRad(lat2);

    const a = (Math.sin(dLat / 2) * Math.sin(dLat / 2)) + (Math.sin(dLon / 2) * Math.sin(dLon / 2)
    * Math.cos(tlat1) * Math.cos(tlat2));
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  }

  // Converts numeric degrees to radians
  toRad = Value => (Value * Math.PI) / 180

  rad2deg = Value => Value * 57.29577951308232

  // checkIfCoorInRoute = (coordinate: Coordinate) => {
  //   const data = {
  //     longitude: 0,
  //     latitude: 0,
  //   };
  //   for (let i = 0; i < AspireParkPoints.length; ++i) {
  //     data.latitude = Number(AspireParkPoints[i].latitude);
  //     data.longitude = Number(AspireParkPoints[i].longitude);
  //     const distance = this.calculateDistance(data.latitude, coordinate.latitude, data.longitude, coordinate.longitude);
  //     if (distance < 0.0001) {
  //       console.log(`checkIfCoorInRoute distance ${distance}: true`);
  //       return true;
  //     }
  //   }
  //   console.log('checkIfCoorInRoute false');
  //   return false;
  // }

  findStation = (coordinate: Coordinate, index: Number) => {
    const data = {
      longitude: 0,
      latitude: 0,
    };
    for (let i = 0; i < AspireParkPoints.length; ++i) {
      if (i === 0) {
        data.latitude = Number(AspireParkPoints[i].latitude);
        data.longitude = Number(AspireParkPoints[i].longitude);
      } else {
        const d1 = this.calcCrow(data.latitude, data.longitude, coordinate.latitude, coordinate.longitude);
        const d2 = this.calcCrow(Number(AspireParkPoints[i].latitude), Number(AspireParkPoints[i].longitude), coordinate.latitude, coordinate.longitude);
        if (d2 < d1) {
          data.latitude = Number(AspireParkPoints[i].latitude);
          data.longitude = Number(AspireParkPoints[i].longitude);
        }
        // console.log(`findStation index = ${i}, d1 = ${d1}, d2 = ${d2}`);
      }
    }
    // console.log(`findStation coordinate = ${JSON.stringify(coordinate)}, data = ${JSON.stringify(data)}`);
    if (index === 0) {
      console.log(`find Start station (${coordinate.latitude} , ${coordinate.longitude}) = (${data.latitude} , ${data.longitude})`);
      // if (this.state.startStation.latitude === data.latitude && this.state.startStation.longitude === data.longitude) {}
      // else {
      this.setState({ startStation: data }, function () {
      // if (!this.checkStartStationInMapCenter()) {
      //   console.log(`findStation: Start ${coordinate.latitude} , ${coordinate.longitude} ---------------------------> ${this.state.startStation.latitude} , ${this.state.startStation.longitude}`);
      //   this.focus2StartStation();
      // }
        this.checkStartStationInMapCenter();
      });
      // }
    } else {
      console.log(`find End station (${this.state.endStation.latitude} , ${this.state.endStation.longitude}) = (${data.latitude} , ${data.longitude})`);
      // if (this.state.endStation.latitude === data.latitude && this.state.endStation.longitude === data.longitude) {}
      // else {
      this.setState({ endStation: data }, function () {
      //  console.log('findStation: End ---------------------------> focus2EndStation');
        this.checkEndStationInMapCenter();
      });
      // }
    }
  }

  findStation2 = (coordinate: Coordinate, index: Number) => {
    const data = {
      longitude: 0,
      latitude: 0,
    };
    for (let i = 0; i < AspireParkPoints.length; ++i) {
      if (i === 0) {
        data.latitude = Number(AspireParkPoints[i].latitude);
        data.longitude = Number(AspireParkPoints[i].longitude);
      } else {
        const d1 = this.calcCrow(data.latitude, data.longitude, coordinate.latitude, coordinate.longitude);
        const d2 = this.calcCrow(Number(AspireParkPoints[i].latitude), Number(AspireParkPoints[i].longitude), coordinate.latitude, coordinate.longitude);
        if (d2 < d1) {
          data.latitude = Number(AspireParkPoints[i].latitude);
          data.longitude = Number(AspireParkPoints[i].longitude);
        }
        // console.log(`findStation index = ${i}, d1 = ${d1}, d2 = ${d2}`);
      }
    }
    // console.log(`findStation coordinate = ${JSON.stringify(coordinate)}, data = ${JSON.stringify(data)}`);
    if (index === 0) {
      console.log(`find Start station (${coordinate.latitude} , ${coordinate.longitude}) = (${data.latitude} , ${data.longitude})`);
      // if (this.state.startStation.latitude === data.latitude && this.state.startStation.longitude === data.longitude) {}
      // else {
      this.focus2Station(data);
      // this.setState({ startStation: data }, function () {
      // if (!this.checkStartStationInMapCenter()) {
      //   console.log(`findStation: Start ${coordinate.latitude} , ${coordinate.longitude} ---------------------------> ${this.state.startStation.latitude} , ${this.state.startStation.longitude}`);
      //   this.focus2StartStation();
      // }
      //  this.checkStartStationInMapCenter();
      // });
      // }
    } else {
      console.log(`find End station (${coordinate.latitude} , ${coordinate.longitude}) = (${data.latitude} , ${data.longitude})`);
      // if (this.state.endStation.latitude === data.latitude && this.state.endStation.longitude === data.longitude) {}
      // else {
      this.focus2Station(data);
      // this.setState({ endStation: data }, function () {
      //  console.log('findStation: End ---------------------------> focus2EndStation');
      //  this.checkEndStationInMapCenter();
      // });
      // }
    }
  }

  addressToLatLng = (address) => {
    // Address Geocoding
    Geocoder.geocodeAddress(address)
      .then((res) => {
        const pos = res[0].position;
        const data = {
          longitude: 0,
          latitude: 0,
        };
        if (pos.lat < MAX_LAT_BOUNDARY
          && pos.lat > MINI_LAT_BOUNDARY
          && pos.lng < MAX_LONG_BOUNDARY
          && pos.lng > MINI_LONG_BOUNDARY) {
          data.longitude = pos.lng;
          data.latitude = pos.lat;
          console.log(pos);
          this.setState({
            addressPosition: data,
          }, function () {
            console.log('---------------------------> addressToLatLng');
            this.animationTimeout = setTimeout(() => {
              this.focusMap([
                { latitude: this.state.addressPosition.latitude, longitude: this.state.addressPosition.longitude },
              ], false);
            }, shortTimeOut);
          });
        } else {
          Alert.alert(strings.error_title, strings.error_address_not_in_boundary);
          this.setState({
            addressPosition: data,
          });
        }
      })
      .catch(err => console.log(err));
  }

  /* _onDeagEnd = (coordinate: Coordinate, index: Number) => {
    // do something here

    this.findStation(coordinate, index);
  }

  _onLongPress = (coordinate: Coordinate) => {
    if (this.state.endStation.latitude === 0 && this.state.endStation.longitude === 0) {
      const data = {
        longitude: 0,
        latitude: 0,
      };
      data.latitude = coordinate.latitude;
      data.longitude = coordinate.longitude;
      this.findStation(data, 1);
    } else {
      console.log('There is nothing to do.');
    }
  } */

  fitToMap = () => {
    const pointOne = {
      latitude : 0,
      longitude: 0
    };
    const pointTwo = {
      latitude: 0,
      longitude: 0
    };
    if (this.state.startStation.latitude >= this.state.endStation.latitude) {
      pointOne.latitude = Number(this.state.startStation.latitude) + inaccuracy;
      pointOne.longitude = this.state.startStation.longitude;
      pointTwo.latitude = Number(this.state.endStation.latitude) - inaccuracy;
      pointTwo.longitude = this.state.endStation.longitude;
    } else {
      pointOne.latitude = Number(this.state.endStation.latitude) + inaccuracy;
      pointOne.longitude = this.state.endStation.longitude;
      pointTwo.latitude = Number(this.state.startStation.latitude) - inaccuracy;
      pointTwo.longitude = this.state.startStation.longitude;
    }
    this.focusMap([
      { latitude: pointOne.latitude, longitude: pointOne.longitude },
      { latitude: pointTwo.latitude, longitude: pointTwo.longitude }
    ], true);
  }

  confirmAlert = () => {
    if (this.checkStepsFlag) {
      this.checkStepsFlag = false;
      let nextStep = this.state.step;
      let confirmStr = strings.step_one;
      if (this.state.step === stepOne) {
        confirmStr = strings.step_one;
        nextStep = stepTwo;
      } else if (this.state.step === stepTwo) {
        confirmStr = strings.step_two;
        nextStep = stepThree;
      } else if (this.state.step === stepThree) {
        confirmStr = strings.step_three;
        nextStep = stepFour;
      }
      if (this.state.step === stepOne || this.state.step === stepTwo || this.state.step === stepThree) {
        Alert.alert(
          strings.step_confirm,
          confirmStr,
          [
            {
              text: strings.cancel,
              onPress: () => { console.log('cancel'); },
            },
            {
              text: strings.ok,
              onPress: () => {
                if (this.state.step === stepOne) {
                  this.setState(
                    {
                      startStation: this.prefocus2Station,
                      step: nextStep
                    }, function () {
                      console.log(`After confirmAlert ${this.state.step}`);
                      this.checkTitleStatus();
                    }
                  );
                } else if (this.state.step === stepTwo) {
                  this.setState(
                    {
                      endStation: this.prefocus2Station,
                      step: nextStep
                    }, function () {
                      console.log(`After confirmAlert ${this.state.step}`);
                      this.checkTitleStatus();
                    }
                  );
                } else {
                  // step 3
                  this.setState(
                    {
                      step: nextStep,
                    }, function () {
                      console.log(`After confirmAlert ${this.state.step}`);
                      this.checkTitleStatus();
                      this.fitToMap();
                    }
                  );
                }
              }
            }
          ],
        );
      }
    }
  }

  checkSteps = () => {
    console.log(`checkSteps ${this.state.step}`);
    if (this.state.systemStatus) {
      if (this.state.step === stepOne) {
        this.checkStepsFlag = true;
        this.findStation2(this.currentMapRegion, 0);
      } else if (this.state.step === stepTwo) {
        this.checkStepsFlag = true;
        this.findStation2(this.currentMapRegion, 1);
      } else if (this.state.step === stepThree) {
        this.checkStepsFlag = true;
        this.confirmAlert();
      } else if (this.state.step === stepFour) {
        this.checkShowNotice(!this.state.systemStatus);
      }
    } else {
      Alert.alert(`${strings.error_title}`, `${strings.error_rest_content}`);
      this.setState({
        step: stepRest,
      });
    }
  }

  checkTitleStatus = () => {
    switch (this.state.step) {
      case stepRest:
        Actions.refresh({ title: strings.rest });
        return strings.rest;
      case stepOne:
        Actions.refresh({ title: strings.step_one });
        return strings.step_confirm;
      case stepTwo:
        Actions.refresh({ title: strings.step_two });
        return strings.step_confirm;
      case stepThree:
        Actions.refresh({ title: strings.step_three });
        return strings.step_confirm;
      case stepFour:
        Actions.refresh({ title: strings.send_request });
        return strings.step_confirm;
      default:
        return strings.rest;
    }
  }

  setButtonStatus = () => {
    if (this.state.step !== stepRest) {
      return true;
    } else {
      return false;
    }
  }

  renderMapView = () => {
    // console.log(`renderMap this.state.carsPosition = ${JSON.stringify(this.state.carsPosition)}`);
    console.log(`renderMap center = ${this.currentMapRegion.latitude} ${this.currentMapRegion.longitude}`);
    const scrollAbility = this.state.step === 3 ? false : true;
    const zoomAbility = this.state.step === 3 ? false : true;
    return (
      <View style={
        {
          ...StyleSheet.absoluteFillObject,
          // height: MAPVIEWHEIGHT,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: 48, // reference height of menuItemArea
          paddingBottom: VIEW_AREA,
        }
      }
      >
        <MapView
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          style={[styles.map, { flex: this.state.flex }]}
          ref={(c) => { this._mapView = c; }}
          mapType={MapView.MAP_TYPES.STANDARD}
          showsCompass={false}
          scrollEnabled={scrollAbility}
          zoomEnabled={zoomAbility}
          maxZoomLevel={20}
          minZoomLevel={15}
          loadingEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          region={this.currentMapRegion}
          onMapReady={this.onMapReady}
          onLayout={this.onMapLayout}
          onRegionChange={this._moveMap}
          onRegionChangeComplete={this._moveMapComplete}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* {this.isMapReady
            && (
              <MapView.Marker
                key="c"
                coordinate={{ latitude: this.state.mapRegion.latitude, longitude: this.state.mapRegion.longitude }}
              >
                <View style={{
                  width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgb(150, 50, 100)'
                }}
                />
              </MapView.Marker>)
          }
          {this.isMapReady
            && (
              <MapView.Marker
                key="d"
                coordinate={{ latitude: this.state.startStation.latitude, longitude: this.state.startStation.longitude }}
              >
                <View style={{
                  width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgb(150, 120, 50)'
                }}
                />
              </MapView.Marker>)
          } */}
          {this.state.isMapReady && this.state.routeCoords.length > 0
            && (
              <Polyline
                coordinates={this.state.routeCoords}
                strokeWidth={2}
                strokeColor="#4169e1"
              />
            )
          }
          { /* this.isMapReady
            && <Polyline
              coordinates={[
                { latitude: MAX_LAT_BOUNDARY, longitude: MINI_LONG_BOUNDARY },
                { latitude: MAX_LAT_BOUNDARY, longitude: MAX_LONG_BOUNDARY },
                { latitude: MINI_LAT_BOUNDARY, longitude: MAX_LONG_BOUNDARY },
                { latitude: MINI_LAT_BOUNDARY, longitude: MINI_LONG_BOUNDARY },
                { latitude: MAX_LAT_BOUNDARY, longitude: MINI_LONG_BOUNDARY }
              ]}
              strokeWidth={3}
              strokeColor="rgb(48, 184, 249)"
            /> */
          }
          {this.state.isMapReady && intersection.length > 0
            && intersection.map((data, index) => (
              <Polyline
                key={`inter-${String(index)}`}
                coordinates={data}
                strokeWidth={3}
                strokeColor="red"
              />
            ))
          }
          {this.state.isMapReady && this.state.carsPosition.map((data, index) => (
            <MapView.Marker
              key={`car-${String(index)}`}
              coordinate={{ latitude: data.latitude, longitude: data.longitude }}
            >
              {this.renderMarker(data.dir === 'left' ? 'car_left' : 'car_right')}
            </MapView.Marker>
          ))
          }
          {this.state.isMapReady && (this.state.step > stepTwo)
            && (
              <MapView.Marker
                key="endStation"
                identifier="endPoint"
                coordinate={this.state.endStation}
              >
                {this.renderMarker('end')}
              </MapView.Marker>)
          }
          { /* this.isMapReady && this.state.touchMap
            && <MapView.Marker
              key="touchPosition"
              coordinate={this.state.touchPosition}
            >
              <View style={{
                width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgb(48, 184, 249)'
              }}
              />
            </MapView.Marker> */
          }
          { /* this.isMapReady && this.state.touchMap
            && <Polyline
              coordinates={[
                this.state.touchPosition,
                this.state.endStation
              ]}
              strokeWidth={1}
              strokeColor="rgb(48, 184, 249)"
            /> */ }
          {this.state.isMapReady && (this.state.step > stepOne)
            && (
              <MapView.Marker
                key="StartStation"
                identifier="startPoint"
                coordinate={this.state.startStation}
              >
                {this.renderMarker('start')}
              </MapView.Marker>
            )
          }
          {
            /* this.isMapReady
            && <MapView.Marker
              key="addressPosition"
              coordinate={this.state.addressPosition}
            >
              {this.renderMarker('d')}
            </MapView.Marker> */
          }
        </MapView>
      </View>
    );
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

  checkStartStationInMapCenter = () => {
    // const distance = this.calculateDistance(this.currentMapRegion.latitude, this.state.startStation.latitude, this.currentMapRegion.longitude, this.state.startStation.longitude);
    // console.log(`checkStartStationInMapCenter map center : ${this.currentMapRegion.latitude} ${this.currentMapRegion.longitude} startStation : ${this.state.startStation.latitude} ${this.state.startStation.longitude} distance ${distance}`);
    // if (distance > 0.0001 || this.checkStepsFlag) {
    //   console.log(`checkStartStationInMapCenter distance ${distance} focus2StartStation`);
    //   this.focus2StartStation();
    // }
    this.focus2StartStation();
  }

  checkStartStationInMapCenter2 = () => {
    const distance = this.calculateDistance(this.currentMapRegion.latitude, this.state.startStation.latitude, this.currentMapRegion.longitude, this.state.startStation.longitude);
    console.log(`checkStartStationInMapCenter2 map center : ${this.currentMapRegion.latitude} ${this.currentMapRegion.longitude} startStation : ${this.state.startStation.latitude} ${this.state.startStation.longitude} distance ${distance}`);
    if (distance > 0.0001 || this.checkStepsFlag) {
      console.log(`checkStartStationInMapCenter2 distance ${distance} focus2StartStation`);
      this.focus2StartStation();
    }
  }

  checkEndStationInMapCenter = () => {
    // const distance = this.calculateDistance(this.currentMapRegion.latitude, this.state.endStation.latitude, this.currentMapRegion.longitude, this.state.endStation.longitude);
    // console.log(`checkEndStationInMapCenter map center : ${this.currentMapRegion.latitude} ${this.currentMapRegion.longitude} endStation : ${this.state.endStation.latitude} ${this.state.endStation.longitude} distance ${distance}`);
    // if (distance > 0.0001 || this.checkStepsFlag) {
    //   console.log(`checkEndStationInMapCenter distance ${distance} focus2EndStation`);
    //   this.focus2EndStation();
    // }
    this.focus2EndStation();
  }

  doConfirmStep = () => {
    // if (!this.checkStepsFlag) {
    //   this.setState({
    //     mapRegion: {
    //       latitude: this.currentMapRegion.latitude,
    //       longitude: this.currentMapRegion.longitude,
    //       latitudeDelta: this.currentMapRegion.latitudeDelta,
    //       longitudeDelta: this.currentMapRegion.longitudeDelta
    //     }
    //   }, function () {
    //     this.checkSteps();
    //   });
    // }
    if (!this.checkStepsFlag) {
      if (this.currentSkipMapRegion !== null) {
        console.log('Use previous skip region');
        this.currentMapRegion = this.currentSkipMapRegion;
      }
      this.checkSteps();
    }
  }

  render() {
    console.log(`render isMapReady: ${this.state.isMapReady}, Step: ${this.state.step}`);
    // const Touchable = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    // const isRest = !(this.state.systemStatus);
    // const status = this.checkStatus(this.state.step);
    const buttonStatus = this.setButtonStatus();
    // const strOperation = (isRest) ? strings.rest : strings.normal_operation;
    let person = person_one;
    if (this.state.passenger === 3) {
      person = person_three;
    } else if (this.state.passenger === 2) {
      person = person_two;
    }

    return (
      <KeyboardAwareScrollView contentContainerStyle={{ flex: 1 }}>
        <View style={styles.container}>
          {this.renderMapView()}
          {this.state.isMapReady && (this.state.step === stepOne)
          && (
            <View style={styles.markerPosition}>
              {this.renderMarker('start')}
            </View>)}
          {(this.state.step === stepTwo)
            && (
            <View style={styles.markerPosition}>
                {this.renderMarker('end')}
            </View>)}
          {(this.state.step === stepThree) && (
            <View style={styles.pickArea}>
              <TouchableOpacity
                onPress={() => { this.setPassenger(); }}
                activeOpacity={0.5}
              >
                <Image
                  style={{ width: MAPVIEWHEIGHT / 3, height: MAPVIEWHEIGHT / 3 }}
                  source={person}
                />
              </TouchableOpacity>
            </View>
          )}
          {(this.state.step === stepFour) && (
            <View style={styles.passengerPosition}>
              <Image
                style={styles.passengerImage}
                source={person}
              />
            </View>)}
          {(buttonStatus) && (
            <View style={styles.buttonPosition}>
              <BarBtn
                title={strings.step_confirm}
                bgColor="rgb(48, 184, 249)"
                containerStyle={styles.btnContainer}
                onPress={() => { this.doConfirmStep(); }}
              />
            </View>)}
          {this.showPickTime && (
            <DateTimePicker
              ref={(c) => { this._timePicker = c; }}
              value={this.state.pickupTime}
              onSelected={(value, pickupTime) => { this.setState({ pickupTime }); }}
              mode="time"
            />)}
          {/* <PointsModal
            ref={(c) => { this._pointsPicker = c; }}
            onPress={(value, point) => { this.selectPoint(value, point); }}
          /> */}
          <LoadingModal ref={(c) => { this._loadingModal = c; }} />
          <EULAModal
            ref={(c) => { this.eulaModal = c; }}
            isNotice={true}
            onAgreed={(agreed) => { this.checkAgreed(agreed); }}
          />
          {this._renderDroupDownMenu()}
        </View>
      </KeyboardAwareScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  markerPosition: {
    position: 'absolute',
    top: MAPVIEWHEIGHT / 2 - 10,
    left: deviceWidth / 2,
    bottom: 0,
    right: deviceWidth / 2
  },
  pickArea: {
    // position: 'absolute',
    // top: TOOLBAR_HEIGHT,
    // left: 10,
    // right: 10,
    justifyContent: 'center',
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  buttonPosition: {
    position: 'absolute',
    bottom: 30,
    left: deviceWidth * confirmBtnSpaceRatio,
    right: deviceWidth * confirmBtnSpaceRatio,
    alignItems: 'center',
  },
  passengerPosition: {
    position: 'absolute',
    bottom: 30 + 48,  // button's padding bottom + button's height
    left: deviceWidth * confirmBtnSpaceRatio,
    paddingBottom:10,
  },
  passengerImage: {
    width: 50,
    height: 50,
  },
  map: {
    // ...StyleSheet.absoluteFillObject,
    width: deviceWidth
  },
  mapMarker: {
    width: 22,
    height: MARKER_SIZE,
    alignItems: 'center',
  },
  focusMarker: {
    width: 40,
    height: 50,
    alignItems: 'center',
  },
  carMarker: {
    width: 50,
    height: 50,
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
  // pickView: {
  //   height: deviceHeight * 0.7,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   width: deviceWidth * 0.6,
  // },
  btnContainer: {
    width: deviceWidth * (1 - 2 * confirmBtnSpaceRatio),
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  textInput: {
    width: deviceWidth - 60,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    fontSize: 18
  },
  textInputBtn: {
    left: 0,
    bottom: 0,
    width: 60,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 230,
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
    right: 8,
    flexDirection: 'column',
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
  shuttle: {
    width: 20,
    height: 20,
    marginTop: 7
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
    enterVersionTwo_pro: store.settings.enterVersionTwo_pro,
  };
}

module.exports = connect(
  select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  })
)(MainPage_v2);
