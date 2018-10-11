/* @flow */
import React from 'react';
import {
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
  Vibration,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { isIphoneX } from 'react-native-iphone-x-helper';
import {
  PlaySound
} from 'react-native-play-sound';

import * as reduxActions from '../../actions';

import type { StopPoint, RequestOrder } from '../../reducers/settings';
import { BarBtn, LoadingModal, BasicController } from '../../components';
import FormatHelper from '../../utils/formatHelper';
import { NativeMqtt, MQTT_REQ } from '../mqtt';
import {
  ic_location,
  ic_back,
  ic_cancel,
  ic_end_station,
  ic_start_station,
  ic_car_left,
  ic_car_right,
} from '../../components/img';
import RequestHelper from '../../utils/requestHelper';
import theme from '../../utils/basicStyle';
import { ApiHelper_V2 } from '../../utils/apiHelper';
import { carRoutePoints, intersection } from './cusConstants';
import QRCodeScanner from 'react-native-qrcode-scanner';

const strings = require('@strings');

const {
  width: deviceWidth,
  height: deviceHeight,
} = Dimensions.get('window');

const MARKER_SIZE = 28;
const TOOLBAR_HEIGHT = (Platform.OS === 'ios') ? ((isIphoneX()) ? 88 : 64) : 56;
const LIST_AREA = 60;
const MAPVIEWHEIGHT = deviceHeight - (TOOLBAR_HEIGHT + LIST_AREA);
const MINI_LAT_BOUNDARY = 24.832827;
const MAX_LAT_BOUNDARY = 24.845788;
const MINI_LONG_BOUNDARY = 121.178700;
const MAX_LONG_BOUNDARY = 121.193800;
const prefocus2startStation = { latitude: 0, longitude: 0 };
const earthRadiusInKM = 6371;
const radiusInKM = 3;
const aspectRatio = 1;
const AspireRoutePoints = carRoutePoints;
const timeout = 1000;
const DURATION = 2000;
const mqtt_debug = false;
const inaccuracy = 0.001;

type Props = {
  stopPoints: Array<StopPoint>,
  requestOrders: Array<RequestOrder>,
  actions: reduxActions,
  accountEmail: string,
  accessToken: string,
};

type State = {
  startPoint: { latitude: number, longitude: number },
  endPoint: { latitude: number, longitude: number },
  mapViewHeight: number,
  carPosition: { latitude: number, longitude: number },
  isMapReady: boolean,
  flex: number,
  mapRegion: {
    latitude: number,
    longitude: number,
    latitudeDelta: number,
    longitudeDelta: number
  },
  routeCoords: null,
}

class MyRequest_v2 extends BasicController<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      startPoint: { latitude: 0, longitude: 0 },
      endPoint: { latitude: 0, longitude: 0 },
      mapViewHeight: MAPVIEWHEIGHT,
      isMapReady: false,
      flex: 0,
      mapRegion: {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0,
        longitudeDelta: 0
      },
      carPosition: { latitude: 0, longitude: 0 },
      routeCoords: AspireRoutePoints,
    };
    this.focusData = {};
    this.preConnectState = 'disconnected';
    this.qrcodeFlag = false;
    this.carChecked = false;
    this.thisCarId = 0;
    this.mapMoving = false;
    this.thisRequestId = 0;
    this.thisRequestStatus = 0;
    this.carGoDisable = true;
    this.carDrivingDirection = '';
  }

  qrcodeFlag: boolean;

  carChecked: boolean;

  animationTimeout: any;

  thisCarId: number;

  mapMoving: boolean;

  thisRequestId: number;

  thisRequestStatus: number;

  carGoDisable: boolean;

  _mapView: MapView;

  _timeoutID: ?any;

  _mqttId: any;

  _loadingModal: ?LoadingModal;

  focusData: ?any;

  preConnectState: string;

  carDrivingDirection: string;

  async componentWillMount() {
    console.log('componentWillMount MyRequest_V2');
    Actions.refresh({
      hideNavBar: false,
      navigationBarStyle: theme.router.navbarStyle,
      title: strings.my_request,
      rightButtonImage: null,
      rightButtonIconStyle: null,
      rightTitle: null,
      // onRight: null,
      leftButtonIconStyle: { paddingLeft: 14, width: 24, height: 24 },
      leftButtonImage: ic_back,
      onLeft: this._onBackClick
    });
    this._queryRequest();
    // await this.getStopPointsFromServer();
  }

  _onBackClick = () => {
    console.log('onBack ~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    this.props.requestOrders.map((data, index) => {
      if (ApiHelper_V2.checkRequestStatus(data.status)) {
        console.log(`++++++ MyRequest renderList +++++This request id: ${data.id} status = ${data.status}`);
        // const adate = new Date(data.arrivaltime * 1000);
        const disableCancel = (data.status === 101);
        // const imageStyle = disableCancel ? [styles.cancel, { tintColor: 'gray' }] : styles.cancel;
        if (disableCancel) this.cancelRequestAlert(data);
      } else {
      }
    });
  }

  componentDidMount() {
    console.log('componentDidMount MyRequest_V2');
    setTimeout(() => this.setState({ flex: 1 }), 100);
    this.props.requestOrders.forEach((data) => {
      if (ApiHelper_V2.checkRequestStatus(data.status)) {
        console.log(`++++++ MyRequest v2 componentDidMount +++++This request id: ${data.id} status = ${data.status} arrivaltime = ${data.arrivaltime}`);
        this.updateMapData(data);
      }
    });
    this._mqttId = NativeAppEventEmitter.addListener(
      MQTT_REQ.EVENTNAME_MQTT_MESSAGE_EVENT,
      (args) => {
        if (mqtt_debug) console.log(args);
        // const logmsg = `${JSON.stringify(args)}`;
        if (args.title === 'connect') {
          if (args.content !== this.preConnectState && args.content === 'connected') {
            this._queryRequest();
            if (typeof this.focusData.id !== 'undefined') {
              this.updateMapData(this.focusData);
            }
          }
          this.preConnectState = args.content;
        } else {
          const list = [].concat(this.props.requestOrders);
          // console.log(`MQTT msg logmsg newMessage = ${JSON.stringify(logmsg)}`);
          if (list.length > 0) {
            const index = list.findIndex(item => args.topic.includes(`${MQTT_REQ.MQTT_REQUEST_TOPIC}${item.id}`));
            if (index > -1) {
              if (args.topic.includes(MQTT_REQ.REQ_INFO) && args.content.length > 0 ) {
                const content = JSON.parse(args.content);
                list[index].carid = content.car_id;
                this.thisCarId = content.car_id;
                if (list[index].status !== Number(content.status)) {
                  if (Number(content.status) !== Number(MQTT_REQ.REQ_STATUS_HANDLING)
                    && Number(content.status) !== Number(MQTT_REQ.REQ_STATUS_WAIT_REPLY)) {
                    console.log('--------------------------------------Vibration');
                    console.log('--------------------------------------PlaySound');
                    PlaySound('notification');
                    Vibration.vibrate(DURATION);
                  }
                  list[index].status = Number(content.status);
                  this.thisRequestId = Number(content.id);
                  this.thisRequestStatus = Number(content.status);
                  if (this.thisRequestStatus === Number(MQTT_REQ.REQ_STATUS_TO_START)) {
                    list[index].arrivaltime = Number(content.prediction_arrival_start_time);
                    Actions.refresh({
                      rightButtonImage: null,
                      rightButtonIconStyle: null,
                      rightTitle: null,
                      leftButtonIconStyle: null,
                      leftButtonImage: null,
                      onLeft: null,
                      onRight: null,
                    });
                  } else if (this.thisRequestStatus === Number(MQTT_REQ.REQ_STATUS_TO_END)) {
                    list[index].arrivaltime = Number(content.prediction_arrival_end_time);
                  } else {
                    list[index].arrivaltime = Number(MQTT_REQ.REQ_ORDER_CONFIRM_NO);
                  }
                  if (this.thisRequestStatus === Number(MQTT_REQ.REQ_STATUS_START) || this.thisRequestStatus === Number(MQTT_REQ.REQ_STATUS_END)) {
                    this.carGoDisable = false;
                  } else {
                    this.carGoDisable = true;
                  }
                  if (this.thisRequestStatus === Number(MQTT_REQ.REQ_DRIVE_CONFIRM_ERROR)) {
                    this.handleServerError(Number(content.error_code));
                  }
                  this.props.actions.requestOrdersEdit(list);
                }
              }
            }
          }
          if (args.topic.includes(MQTT_REQ.MQTT_CAR_TOPIC) && args.topic.includes(MQTT_REQ.CAR_LOGS)) {
            if (args.content.length > 0) {
              try {
                const carInfo = JSON.parse(args.content);
                if (carInfo.cur_lat > 0 && carInfo.cur_lon > 0) {
                  if (carInfo.carID === this.thisCarId) {
                    this.carDrivingDirection = this.checkCarDrivingDirection(this.state.carPosition.latitude, this.state.carPosition.longitude, Number(carInfo.cur_lat), Number(carInfo.cur_lon));
                    const data = { latitude: Number(carInfo.cur_lat), longitude: Number(carInfo.cur_lon) };
                    if (!this.mapMoving) {
                      this.setState({ carPosition: data });
                    }
                  }
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
    console.log('componentWillUnmount myRequest_v2');
    this._mqttId && NativeAppEventEmitter.removeSubscription(this._mqttId);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      // do something when app active
      // await this.getStopPointsFromServer();
      if (Platform.OS === 'ios') {
        this._queryRequest();
        if (typeof this.focusData.id !== 'undefined') {
          this.updateMapData(this.focusData);
        }
      }
    }
  }

  _queryRequest = () => {
    let request = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_REQUEST_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    this.props.requestOrders.forEach((data) => {
      // console.log(`MyRequest_v2 renderList data.status = ${data.status}`);
      if (ApiHelper_V2.checkRequestStatus(data.status)) {
        request = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_REQUEST_TOPIC}${data.id}/${MQTT_REQ.REQ_INFO}`;
        NativeMqtt.subscribe(request, 1);
      }
    });
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
    const latitudeDelta = (Math.abs(bounds.top - bounds.bottom)) * 1.75;
    const longitudeDelta = (Math.abs(bounds.left - bounds.right)) * 1.75;

    return {
      latitude: regionCenter.latitude,
      longitude: regionCenter.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  }

  onMapReady = () => {
    /* InteractionManager.runAfterInteractions(() => {
      this._handleRegionAndAnimate();
    }); */
  }

  cancelRequestAlert = (data) => {
    Alert.alert(
      strings.step_confirm,
      strings.user_cancel_alert,
      [
        {
          text: strings.cancel,
          onPress: () => { console.log('cancel'); },
        },
        {
          text: strings.ok,
          onPress: () => { this.cancelRequest(data); },
        }
      ],
    );
  }

  cancelRequest = async (data: RequestOrder) => {
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken } = this.props;
    const { errorCode, errorMessage } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? `${RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_REQUEST)}/${data.id}/${RequestHelper.V2_REQUEST_CANCEL}` : `${RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_REQUEST)}/${data.id}/${RequestHelper.V2_REQUEST_CANCEL}`,
      'POST',
      JSON.stringify({
        requestId: `${data.id}`,
      }),
      { 'content-type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    );
    this._loadingModal && this._loadingModal.hideLoadingPage();
    if (errorCode === RequestHelper.errorCode.NO_ERROR) {
      console.log('cancelRequest success');
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

  updateMapData = (data: RequestOrder) => {
    this.focusData = data;
    const car = `${MQTT_REQ.REQ_AREA}1/${MQTT_REQ.MQTT_CAR_TOPIC}${data.carid}/${MQTT_REQ.CAR_LOGS}`;
    NativeMqtt.subscribe(car, 1);
    const start = { latitude: Number(data.start_lat), longitude: Number(data.start_long) };
    const end = { latitude: Number(data.end_lat), longitude: Number(data.end_long) };
    this.setState({
      startPoint: start,
      endPoint: end,
    });
  }

  checkRequest = (status: number) => {
    switch (status) {
      case 100:
        return strings.waiting_for_reply;
      case 101:
        return strings.server_accept;
      case 102:
        return strings.waiting_for_procrssing;
      case 103:
        return strings.to_start;
      case 104:
        return strings.car_start;
      case 105:
        return strings.to_end;
      case 106:
        return strings.car_end;
      case 107:
        return strings.to_garage;
      case 108:
        return strings.request_close;
      case 109:
        return strings.admin_cancel;
      case 110:
        return strings.user_cancel;
      case 111:
        return strings.admin_not_login;
      case 112:
        return strings.car_busy;
      default:
        return strings.waiting_for_reply;
    }
  }

  onMapLayout = () => {
    console.log(`onMapLayout isMapReady ${this.state.isMapReady}`);
    // if (!this.state.isMapReady) {
    this.setState({ isMapReady: true }, function () {
      this.checkStartStationInMapCenter();
    });
    this._mapView && this._mapView.setMapBoundaries({ latitude: MAX_LAT_BOUNDARY, longitude: MINI_LONG_BOUNDARY }, { latitude: MINI_LAT_BOUNDARY, longitude: MAX_LONG_BOUNDARY });
    /* if (this._mapView && this.state.mapRegion.latitude === 0 && this.state.mapRegion.longitude === 0) {
      // this.showRegion({ latitude: INIT_MAP_CENTER_LAT, longitude: INIT_MAP_CENTER_LNG });
      this.focus2StartStation();
    } */
  }

  focus2StartStation() {
    if (!this.state.isMapReady) {
      console.log('Map not ready');
    }
    else
    if (this.state.startPoint.latitude === 0 && this.state.startPoint.longitude === 0) {}
    else {
      if (prefocus2startStation.latitude === this.state.startPoint.latitude && prefocus2startStation.longitude === this.state.startPoint.longitude) {
        console.log('focus2StartStation the same station');
        if (this.animationTimeout) {
          clearTimeout(this.animationTimeout);
          console.log(`focus2StartStation the same station: clearTimeout ${this.animationTimeout}`);
        }
      }
      prefocus2startStation.latitude = this.state.startPoint.latitude;
      prefocus2startStation.longitude = this.state.startPoint.longitude;
      const pointOne = {
        latitude: 0,
        longitude: 0
      };
      const pointTwo = {
        latitude: 0,
        longitude: 0
      };
      if (this.state.startPoint.latitude >= this.state.endPoint.latitude) {
        pointOne.latitude = Number(this.state.startPoint.latitude) + inaccuracy;
        pointOne.longitude = this.state.startPoint.longitude;
        pointTwo.latitude = Number(this.state.endPoint.latitude) - inaccuracy;
        pointTwo.longitude = this.state.endPoint.longitude;
      } else {
        pointOne.latitude = Number(this.state.endPoint.latitude) + inaccuracy;
        pointOne.longitude = this.state.endPoint.longitude;
        pointTwo.latitude = Number(this.state.startPoint.latitude) - inaccuracy;
        pointTwo.longitude = this.state.startPoint.longitude;
      }
      this.animationTimeout = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          this.focusMap([
            { latitude: pointOne.latitude, longitude: pointOne.longitude },
            { latitude: pointTwo.latitude, longitude: pointTwo.longitude }
          ], true);
        });
      }, timeout);
      console.log(`focus2StartStation -------------> id ${this.animationTimeout}`);
    }
  }

  focusMap(markers, animated) {
    console.log('Markers received to populate map!');
    if (this._mapView) {
      this._mapView.fitToCoordinates(markers, animated);
    }
    // if (this._mapView) this._mapView.fitToSuppliedMarkers(['startPoint', 'endPoint'], false);
  }

  showRegion(locationCoords) {
    if (locationCoords && locationCoords.latitude && locationCoords.longitude) {
      const radiusInRad = radiusInKM / earthRadiusInKM;
      const lonDelta = this.rad2deg(radiusInRad / Math.cos(this.toRad(locationCoords.latitude)));
      const latDelta = aspectRatio * this.rad2deg(radiusInRad);

      this.setState({
        mapRegion: {
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
          latitudeDelta: latDelta,
          longitudeDelta: lonDelta
        }
      });
    }
  }

  // Converts numeric degrees to radians
  toRad = Value => (Value * Math.PI) / 180

  rad2deg = Value => Value * 57.29577951308232

  checkCar = () => {
    if (this.thisRequestStatus === Number(MQTT_REQ.REQ_STATUS_START)) {
      // The car has arrived at the start station.
      if (!this.carChecked) {
        // The car has not checked.
        this.qrcodeFlag = true;
      } else {
        // The car has checked and it's correct.
        this.carGo();
      }
    } else {
      // The car has arrived at the end station.
      this.carGo();
    }
  }

  carGo = async () => {
    this._loadingModal && this._loadingModal.showLoadingPage();
    const { accessToken } = this.props;
    const { errorCode, errorMessage } = await RequestHelper.getResponse(
      (this.props.enterVersionTwo_pro) ? `${RequestHelper.getServiceURL_V2_pro(RequestHelper.V2_REQUEST)}/${this.thisRequestId}/${RequestHelper.V2_REQUEST_GO}` : `${RequestHelper.getServiceURL_V2_debug(RequestHelper.V2_REQUEST)}/${this.thisRequestId}/${RequestHelper.V2_REQUEST_GO}`,
      'POST',
      JSON.stringify({
        requestId: `${this.thisRequestId}`,
      }),
      { 'content-type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    );
    if (errorCode === RequestHelper.errorCode.NO_ERROR) {
      console.log('car_go');
      this.carChecked = false;
      this._loadingModal && this._loadingModal.hideLoadingPage();
    } else {
      console.log('car_go failed', errorMessage);
      this._loadingModal && this._loadingModal.hideLoadingPage();
      this.handleServerError(Number(errorCode));
    }
  }

  _moveMap = (e) => {
    // console.log(e);
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
    if (e.latitude > MINI_LAT_BOUNDARY
      && e.latitude < MAX_LAT_BOUNDARY
      && e.longitude > MINI_LONG_BOUNDARY
      && e.longitude < MAX_LONG_BOUNDARY) {
      const distance = this.calculateDistance(e.latitude, this.state.mapRegion.latitude, e.longitude, this.state.mapRegion.longitude);
      console.log(`distance: ${distance}`);
      /* if (distance === 0) {
        this.checkStartStationInMapCenter();
      } */
      if (distance > 0.003) {
        this.setState({
          mapRegion: {
            latitude: e.latitude,
            longitude: e.longitude,
            latitudeDelta: e.latitudeDelta,
            longitudeDelta: e.longitudeDelta
          }
        });
        // this.checkStartStationInMapCenter();
      }
      this.mapMoving = false;
    }
  }

  checkStartStationInMapCenter = () => {
    const distance = this.calculateDistance(this.state.mapRegion.latitude, this.state.startPoint.latitude, this.state.mapRegion.longitude, this.state.startPoint.longitude);
    console.log(`checkStartStationInMapCenter map center : ${this.state.mapRegion.latitude} ${this.state.mapRegion.longitude} startStation : ${this.state.startPoint.latitude} ${this.state.startPoint.longitude} distance ${distance}`);
    if (distance > 0.0001) {
      console.log(`checkStartStationInMapCenter distance ${distance} focus2StartStation`);
      this.focus2StartStation();
    }
  }

  onSuccess = (e) => {
    console.log(e.data);
    Vibration.vibrate(DURATION);
    if (Number(e.data) === this.thisCarId) {
      this.qrcodeFlag = false;
      this.carChecked = true;
      Alert.alert(strings.qrcode_correct_title, strings.qrcode_correct_content);
    } else {
      this.qrcodeFlag = false;
      this.carChecked = false;
      Alert.alert(strings.qrcode_wrong_title, strings.qrcode_wrong_content);
    }
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

  renderMapView = () => {
    return (
      <View style={
        {
          ...StyleSheet.absoluteFillObject,
          // height: MAPVIEWHEIGHT,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: 48, // reference height of menuItemArea
          paddingBottom: LIST_AREA,
        }
      }
      >
        <MapView
          provider={PROVIDER_GOOGLE}
          style={[styles.map, { flex: this.state.flex }]}
          ref={(c) => { this._mapView = c; }}
          mapType={MapView.MAP_TYPES.STANDARD}
          showsCompass={false}
          scrollEnabled={!this.qrcodeFlag}
          zoomEnabled={true}
          maxZoomLevel={20}
          minZoomLevel={15}
          loadingEnabled={true}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          region={this.state.mapRegion}
          onMapReady={this.onMapReady}
          onLayout={this.onMapLayout}
          onRegionChange={this._moveMap}
          onRegionChangeComplete={this._moveMapComplete}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {this.state.isMapReady
            && (
              <Polyline
                coordinates={this.state.routeCoords}
                strokeWidth={2}
                strokeColor="#4169e1"
              />
            )
          }
          {/* this.state.isMapReady
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
          {this.state.isMapReady
            && intersection.map((data, index) => (
              <Polyline
                key={`inter-${String(index)}`}
                coordinates={data}
                strokeWidth={3}
                strokeColor="red"
              />
            ))
          }
          {this.state.isMapReady
            && (
              <MapView.Marker
                key="car"
                coordinate={this.state.carPosition}
              >
                {this.renderMarker(this.carDrivingDirection === 'car_left' ? 'car_left' : 'car_right')}
              </MapView.Marker>
            )
          }
          {this.state.isMapReady
            && (
              <MapView.Marker
                key="startPoint"
                identifier="startPoint"
                coordinate={this.state.startPoint}
              >
                {this.renderMarker('start')}
              </MapView.Marker>
            )
          }
          {this.state.isMapReady
            && (
              <MapView.Marker
                key="endPoint"
                identifier="endPoint"
                coordinate={this.state.endPoint}
              >
                {this.renderMarker('end')}
              </MapView.Marker>
            )
          }
        </MapView>
      </View>
    );
  }

  checkButtonTitle = () => {
    switch (this.thisRequestStatus) {
      case Number(MQTT_REQ.REQ_STATUS_ACCEPT):
        return '';
      case Number(MQTT_REQ.REQ_STATUS_TO_START):
        return '';
      case Number(MQTT_REQ.REQ_STATUS_START):
        if (this.carChecked) {
          return strings.get_on;
        } else {
          return strings.qrcode_check;
        }
      case Number(MQTT_REQ.REQ_STATUS_TO_END):
        return '';
      case Number(MQTT_REQ.REQ_STATUS_END):
        return strings.get_off;
      default:
        return strings.car_go;
    }
  }

  checkCarDrivingDirection = (pre_lat, pre_long, lat, long) => {
    if ((lat - pre_lat > 0) && (long - pre_long < 0)) {
      return 'car_left';
    } else if ((lat - pre_lat < 0) && (long - pre_long > 0)) {
      return 'car_right';
    } else if ((lat - pre_lat > 0) && (long - pre_long > 0)) {
      return 'car_left';
    } else if ((lat - pre_lat < 0) && (long - pre_long < 0)) {
      return 'car_right';
    } else {
      return this.carDrivingDirection;
    }
  }

  render() {
    const Touchable = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    const buttonTitle = this.checkButtonTitle();
    return (
      <View style={styles.container}>
        {this.renderMapView()}
        <View style={{ height: LIST_AREA, backgroundColor: 'rgba(0, 0, 0, 0.12)' }}>
          <ScrollView>
            {this.props.requestOrders.map((data, index) => {
              if (ApiHelper_V2.checkRequestStatus(data.status)) {
                // console.log(`++++++ MyRequest renderList +++++This request id: ${data.id} status = ${data.status} arrivaltime = ${data.arrivaltime}`);
                const adate = new Date(data.arrivaltime * 1000);
                const disableCancel = !(data.status === 101);
                const imageStyle = disableCancel ? [styles.cancel, { tintColor: 'gray' }] : styles.cancel;
                return (
                  <View
                    key={`request-${String(index)}`}
                    style={styles.ListArea}
                  >
                    <View style={styles.pickView}>
                      <Text style={styles.pickTimeText}>
                        {(data.arrivaltime > 0) ? FormatHelper.simpleDateFormat(adate, FormatHelper.DATE_FORMAT_TYPE.HHmm) : '-- : --'}
                      </Text>
                      <Text style={styles.pickTitleText}>
                        {strings.pickup_time}
                      </Text>
                    </View>
                    <View style={styles.divView} />
                    <Text style={styles.msg}>
                      {this.checkRequest(data.status)}
                    </Text>
                    <Touchable
                      onPress={() => { this.cancelRequestAlert(data); }}
                      disabled={disableCancel}
                    >
                      <View style={{ padding: 16 }}>
                        <Image source={ic_cancel} style={imageStyle} />
                      </View>
                    </Touchable>
                  </View>
                );
              } else {
                return null;
              }
            })}
          </ScrollView>
        </View>
        {(!this.carGoDisable) && (
          <View style={styles.buttonPosition}>
            <BarBtn
              title={buttonTitle.toUpperCase()}
              bgColor="rgb(48, 184, 249)"
              containerStyle={styles.btnContainer}
              onPress={() => { this.checkCar(); }}
            />
          </View>)}
        {(this.qrcodeFlag) && (
          <View style={styles.cameraPosition}>
            <QRCodeScanner
              fadeIn={true}
              showMarker={true}
              checkAndroid6Permissions={true}
              onRead={this.onSuccess}
              topContent={
                (
                  <Text style={styles.centerText}>
                    {strings.qrcode_title}
                  </Text>
                )
              }
            />
          </View>)}
        <LoadingModal ref={(c) => { this._loadingModal = c; }} />
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
    ...Platform.select({ android: { fontFamily: 'sans-serif-black' } }),
    marginTop: 2
  },
  focusMarkName: {
    color: '#fff',
    fontSize: 18,
    ...Platform.select({ android: { fontFamily: 'sans-serif-black' } }),
    marginTop: 2
  },
  btnContainer: {
    width: deviceWidth * 0.8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  Id: {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 24,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    marginHorizontal: 16,
  },
  ListArea: {
    width: deviceWidth,
    height: 60,
    bottom: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    alignItems: 'center',
    flexDirection: 'row',
  },
  divView: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  pickTitleText: {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.54)',
    fontSize: 12,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  pickTimeText: {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 16,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    marginBottom: 4,
  },
  pickView: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  msg: {
    backgroundColor: 'transparent',
    color: 'rgb(48, 184, 249)',
    fontSize: 14,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    marginLeft: 16,
    flex: 1,
  },
  cancel: {
    width: 24,
    height: 24,
  },
  shuttle: {
    width: 20,
    height: 20,
    marginTop: 7
  },
  buttonPosition: {
    position: 'absolute',
    bottom: 90,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  cameraPosition: {
    position: 'absolute',
    bottom: 90,  // as buttonPosition above
    left: 0,
    right: 0,
    width: deviceWidth,
    alignItems: 'center',
    backgroundColor: 'rgb(48, 184, 249)'
  },
  centerText: {
    flex: 1,
    fontSize: 18,
    padding: 10,
    color: 'white',
  },
});

function select(store) {
  return {
    stopPoints: store.settings.stopPoints,
    requestOrders: store.settings.requestOrders,
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
)(MyRequest_v2);
