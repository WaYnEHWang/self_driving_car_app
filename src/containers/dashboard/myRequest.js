/* @flow */
import React from 'react';
import {
  AppState,
  Dimensions,
  ImageBackground,
  NativeAppEventEmitter,
  Platform,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import MapView from 'react-native-maps';
import { isIphoneX } from 'react-native-iphone-x-helper';

import * as reduxActions from '../../actions';

import type { StopPoint, RequestOrder } from '../../reducers/settings';
import { BarBtn, LoadingModal, BasicController } from '../../components';
import FormatHelper from '../../utils/formatHelper';
import { NativeMqtt, MQTT_REQ } from '../mqtt';
import { ic_location, ic_cancel, ic_shuttle } from '../../components/img';
import RequestHelper from '../../utils/requestHelper';
import theme from '../../utils/basicStyle';
import ApiHelper from '../../utils/apiHelper';

const strings = require('@strings');

const {
  width: deviceWidth,
  height: deviceHeight,
} = Dimensions.get('window');

const MARKER_SIZE = 28;
const TOOLBAR_HEIGHT = (Platform.OS === 'ios' ) ? ((isIphoneX()) ? 88 : 64) : 56;
const LIST_AREA = 88;
const MAPVIEWHEIGHT = deviceHeight - (TOOLBAR_HEIGHT + LIST_AREA);

type Props = {
  stopPoints: Array<StopPoint>,
  requestOrders: Array<RequestOrder>,
  actions: reduxActions,
  accountEmail: string,
  accessToken: string,
};

type State = {
  startPoint: string,
  endPoint: string,
  mapViewHeight: number,
  carPosition: { latitude: number, longitude: number },
}

class MyRequest extends BasicController<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      startPoint: '',
      endPoint: '',
      mapViewHeight: MAPVIEWHEIGHT,
      carPosition: { latitude: Number(this.props.stopPoints[0].x), longitude: Number(this.props.stopPoints[0].y) },
    };
    this.focusData = {};
    this.preConnectState = 'disconnected';
  }

  async componentWillMount() {
    Actions.refresh({
      hideNavBar: false,
      navigationBarStyle: theme.router.navbarStyle,
      title: strings.my_request,
      leftButtonImage: '',
      leftButtonIconStyle: null,
      onLeft: null
    });
    this._queryRequest();
    await this.getStopPointsFromServer();
  }

  componentDidMount() {
    console.log('componentDidMount MyRequest');
    this._mqttId = NativeAppEventEmitter.addListener(
      MQTT_REQ.EVENTNAME_MQTT_MESSAGE_EVENT,
      (args) => {
        const logmsg = `${JSON.stringify(args)}`;
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
          console.log(`MQTT msg logmsg newMessage = ${JSON.stringify(logmsg)}`);
          if (list.length > 0) {
            const index = list.findIndex(item => args.topic.includes(`${MQTT_REQ.MQTT_REQUEST_TOPIC}${item.id}`));
            if (index > -1) {
              if (args.topic.includes('requeststatus')) {
                if (list[index].status !== Number(args.content)) {
                  list[index].status = Number(args.content);
                  this.props.actions.requestOrdersEdit(list);
                }
              }
              if (args.topic.includes('carid')) {
                if (args.content !== 'null') {
                  list[index].carid = args.content;
                  this.props.actions.requestOrdersEdit(list);
                }
              }
              if (args.topic.includes('arrivaltime')) {
                if (args.content !== 'null') {
                  list[index].arrivaltime = Number(args.content);
                  this.props.actions.requestOrdersEdit(list);
                }
              }
            }
          }
          if (args.topic.includes('realtime_info')) {
            if (args.content.length > 0) {
              try {
                const carInfo = JSON.parse(args.content);
                if (carInfo.cur_x.length > 0 && carInfo.cur_y.length) {
                  const data = { latitude: Number(carInfo.cur_x), longitude: Number(carInfo.cur_y) };
                  this.setState({ carPosition: data });
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
    console.log('componentWillUnmount MyRequest');
    this._mqttId && NativeAppEventEmitter.removeSubscription(this._mqttId);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _mapView: MapView;
  _timeoutID: ?any;
  _mqttId: any;
  _loadingModal: ?LoadingModal;
  focusData: ?any;
  preConnectState: string;

  _handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      // do something when app active
      await this.getStopPointsFromServer();
      if (Platform.OS === 'ios') {
        this._queryRequest();
        if (typeof this.focusData.id !== 'undefined') {
          this.updateMapData(this.focusData);
        }
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
    let request = `${MQTT_REQ.MQTT_REQUEST_TOPIC}${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    this.props.requestOrders.forEach((data) => {
      console.log(`MyRequest renderList data.status = ${data.status}`);
      if (ApiHelper.checkRequestStatus(data.status)) {
        request = `${MQTT_REQ.MQTT_REQUEST_TOPIC}${data.id}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
        NativeMqtt.subscribe(request, 2);
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

  _handleRegionAndAnimate = () => {
    const points = this.props.stopPoints;
    if (points.length > 0) {
      this._timeoutID = setTimeout(() => {
        this._mapView && this._mapView.animateToBearing(335);
      }, 200);
    }
  }

  onMapReady = () => {
    /* InteractionManager.runAfterInteractions(() => {
      this._handleRegionAndAnimate();
    }); */
  }

  cancelRequest = async (data: RequestOrder) => {
    this._loadingModal && this._loadingModal.showLoadingPage();
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
    this._loadingModal && this._loadingModal.hideLoadingPage();
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

  updateMapData = (data: RequestOrder) => {
    this.focusData = data;
    const car = `${MQTT_REQ.MQTT_CAR_TOPIC}${data.carid}/${MQTT_REQ.MQTT_SUBSCRIBE_ALL}`;
    NativeMqtt.subscribe(car, 2);
    this.setState({
      startPoint: data.start,
      endPoint: data.end,
    });
  }

  checkRequest = (status: number) => {
    switch (status) {
      case 100:
        return strings.waiting_for_reply;
      case 101:
        return strings.server_accept;
      case 102:
        return strings.rest;
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
    const tPoints = [];
    let starIndex = 0;
    let endIndex = 0;
    if (points.length > 0) {
      for (let i = 0; i < points.length; ++i) {
        if (points[i].name !== 'garage') {
          const data = {
            latitude: Number(points[i].x),
            longitude: Number(points[i].y),
          };

          if (points[i].name === this.state.startPoint) {
            starIndex = tPoints.length;
          }
          if (points[i].name === this.state.endPoint) {
            endIndex = tPoints.length;
          }
          tPoints.push(data);
        }
      }
      region = this.findRegion(tPoints);
    }

    console.log(`renderMapView starIndex: ${starIndex}, endIndex: ${endIndex}`);

    return (
      <View style={{ height: this.state.mapViewHeight }}>
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
          {starIndex > 999 &&
            <MapView.Polyline
              coordinates={tPoints.slice(starIndex, endIndex + 1)}
              strokeColor="#33709e"
              fillColor="#33709e"
              strokeWidth={4}
            />
          }
          { points.map((data, index) => (
            <MapView.Marker
              key={`point-${String(index)}`}
              coordinate={{ latitude: Number(data.x), longitude: Number(data.y) }}
            >
              {this.renderMarker(data.name)}
            </MapView.Marker>))
          }
          <MapView.Marker
            coordinate={this.state.carPosition}
          >
            <View style={styles.markerConatiner}>
              <ImageBackground
                style={styles.focusMarker}
                imageStyle={{ tintColor: 'rgb(48, 184, 249)' }}
                source={ic_location}
                onLoad={() => this.forceUpdate()}
              >
                <Text style={{ width:0, height:0 }}>{Math.random()}</Text>
                <Image source={ic_shuttle} style={styles.shuttle} />
              </ImageBackground>
            </View>
          </MapView.Marker>
        </MapView>
      </View>
    );
  }

  render() {
    let count = 0;
    const Touchable = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    return (
      <View style={styles.container}>
        {this.renderMapView()}
        <View style={{ height: LIST_AREA, backgroundColor: 'rgba(0, 0, 0, 0.12)' }}>
          <ScrollView>
            {this.props.requestOrders.map((data, index) => {
          console.log(`MyRequest renderList data.status = ${data.status}`);
          if (ApiHelper.checkRequestStatus(data.status)) {
            ++count;
            console.log(`++++++ MyRequest renderList data.arrivaltime = ${data.arrivaltime}`);

            const adate = new Date(data.arrivaltime * 1000);
            const disableCancel = (data.status === 105);
            const imageStyle = disableCancel ? [styles.cancel, { tintColor: 'gray' }] : styles.cancel;
            return (
              <Touchable
                key={`request-${String(index)}`}
                onPress={() => { this.updateMapData(data); }}
              >
                <View style={styles.ListArea}>
                  <Text style={styles.Id}>{(`0${String(count)}`).slice(-2)}</Text>
                  <View style={styles.divView} />
                  <View style={styles.pickView}>
                    <Text style={styles.pickTimeText}>{(data.arrivaltime > 0) ? FormatHelper.simpleDateFormat(adate, FormatHelper.DATE_FORMAT_TYPE.HHmm) : '-- : --'}</Text>
                    <Text style={styles.pickTitleText}>{strings.pickup_time}</Text>
                  </View>
                  <View style={styles.divView} />
                  <Text style={styles.msg}>{this.checkRequest(data.status)}</Text>
                  <Touchable
                    onPress={() => { this.cancelRequest(data); }}
                    disabled={disableCancel}
                  >
                    <View style={{ padding: 16 }}>
                      <Image source={ic_cancel} style={imageStyle} />
                    </View>
                  </Touchable>
                </View>
              </Touchable>
            );
            } else {
              return null;
            }
          })}
          </ScrollView>
        </View>
        <BarBtn
          title={strings.add_request.toUpperCase()}
          bgColor="rgb(48, 184, 249)"
          containerStyle={styles.btnContainer}
          disabled={true}
          onPress={() => { Actions.MainPage({ add: true }); }}
        />
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
    left: 0,
    bottom: 0,
    width: deviceWidth,
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
    height: 72,
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
  cancel:{
    width: 24,
    height:24,
  },
  shuttle:{
    width: 20,
    height:20,
    marginTop: 8
  },
});

function select(store) {
  return {
    stopPoints: store.settings.stopPoints,
    requestOrders: store.settings.requestOrders,
    accountEmail: store.settings.accountEmail,
    accessToken: store.settings.accessToken,
  };
}

module.exports = connect(
  select,
  dispatch => ({
    actions: bindActionCreators(reduxActions, dispatch)
  })
)(MyRequest);
