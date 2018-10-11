/* @flow */
import MqttManager from './mqttManager';

const MQTT_REQ = {
  // send request
  MQTT_REQUEST_ADMIN: 'admin/',
  MQTT_REQUEST_TOPIC: 'request/',
  MQTT_CAR_TOPIC: 'car/',
  MQTT_SUBSCRIBE_ALL: '#',

  WAPI_REQ_ORDER_CREATE: 'requestorder/create',
  WAPI_REQ_ADMIN_LOGIN: 'admin/login',
  WAPI_REQ_ADMIN_LOGOUT: 'admin/logout',
  WAPI_REQ_ORDER_CONFIRM: 'requestorder/confirm',
  WAPI_REQ_DRIVE_CONFIRM: 'car/nextstep/confirm',
  WAPI_REQ_USER_CANCEL: 'user/cancel',
  WAPI_REQ_ADMIN_CLOSE_USER_CANCEL: 'requestorder/user_cancel/close',
  WAPI_REQ_ADMIN_INTERRUPT: 'admin/interrupt',
  WAPI_REQ_MAP_STATION_DATA: 'user/getinfo',

  REQ_ORDER_CONFIRM_NO: '0',
  REQ_ORDER_CONFIRM_YES: '1',

  REQ_DRIVE_CONFIRM_ERROR: '999',

  // for request topic
  REQ_START: 'start',
  REQ_END: 'end',
  REQ_PEOPLE: 'people',
  REQ_ARRIVALTIME: 'arrivaltime',
  REQ_CARID: 'carid',
  REQ_REQUEST_STATUS: 'requeststatus',
  REQ_ADMIN_ID: 'adminid',
  REQ_RESPONSE_1: 'response1',
  REQ_RESPONSE_2: 'response2',
  REQ_CANCEL: 'cancel',
  REQ_REMARKS: 'remarks',
  REQ_CREATE_TIME: 'createtime',

  // for car topic
  CAR_POSITION: 'position',

  // for request topic requeststatus
  REQ_STATUS_WAIT_REPLY: '100',
  REQ_STATUS_ACCEPT: '101',
  REQ_STATUS_HANDLING: '102',
  REQ_STATUS_TO_START: '103',
  REQ_STATUS_START: '104',
  REQ_STATUS_TO_END: '105',
  REQ_STATUS_END: '106',
  REQ_STATUS_TO_GARAGE: '107',
  REQ_STATUS_CLOSE: '108',
  REQ_STATUS_USER_CANCEL: '110',

  // MQTT message eventName
  EVENTNAME_MQTT_MESSAGE_EVENT: 'onMqttMessageEvent',

  // for version 2
  REQ_AREA: 'area/',
  REQ_INFO: 'info',
  CAR_LOGS: 'logs',
  CAR_STATUS: 'status',
};

class NativeMqtt {
  static subscribe(topicName: string, qos: number) {
    MqttManager.subscribe(topicName, qos);
  }

  static sendRequestNotification() {
    MqttManager.sendRequestNotification();
  }

  static setAccountType(type: string) {
    MqttManager.setAccountType(type);
  }

  static set2v2_pro(v2: boolean) {
    MqttManager.set2v2_pro(v2);
  }
}

module.exports = { NativeMqtt, MQTT_REQ };
