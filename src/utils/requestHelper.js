/* @flow */
import { AsyncStorage, Platform, NativeModules } from 'react-native';
import { GoogleSignin } from 'react-native-google-signin';
import { LoginManager } from 'react-native-fbsdk';

import iosClientId from '../config/iOSClientId';

import { NativeMqtt } from '../containers/mqtt';

const strings = require('@strings');

const { FcmManager } = NativeModules;

const RequestHelper = {
  // V1
  SERVER_HOST: 'https://www.sdc-acer.com/SDCMOD/webservice/webapi/v2/',
  SERVER_HOST_DEBUG: 'http://10.36.162.242/SDCMOD/webservice/webapi/v2/',
  SERVER_REQUEST: 'requestorder',
  SERVER_ADMIN: 'admin',
  SERVER_USER_INFO: 'user/getinfo',
  SERVER_USER_CANCEL: 'user/cancel',
  SERVER_USER_LOGIN: 'user/login',
  SERVER_CAR_TO_GO: 'car/nextstep/go',
  SERVER_ADMIN_INTERRUPT: 'admin/interrupt',
  SERVER_USER_LOGOUT: 'user/logout',
  // V2
  V2_SERVER_HOST_PRO: 'https://web.sdc-acer.com/SDCMOD/api/v2/',
  V2_SERVER_HOST_DEBUG: 'https://labweb.sdc-acer.com/SDCMOD/api/v2/',
  V2_USER_LOGIN: 'login',
  V2_USER_LOGOUT: 'logout',
  V2_USER_INFO: 'me',
  V2_REQUEST_ORDER: 'area/1/requestordercreate',
  V2_REQUEST_GO: 'go',
  V2_REQUEST_CANCEL: 'cancel',
  V2_REQUEST: 'request',
  V2_GET_USER_EMAIL: 'https://graph.facebook.com/v2.5/me?fields=email,name,friends&access_token=',
  V2_HEADER_TYPE: 'content-type',
  V2_HEADER_FORMAT: 'application/json',
  getServiceURL(webService: string): string {
    return this.SERVER_HOST + webService;
  },

  getServiceURL_V2_debug(webService: string): string {
    return this.V2_SERVER_HOST_DEBUG + webService;
  },

  getServiceURL_V2_pro(webService: string): string {
    return this.V2_SERVER_HOST_PRO + webService;
  },

  async getResponse(url: string, method: string, body: ?string, headers: Object, successCode: Array<number> = [200]): Object {
    try {
      console.log(`start fetch url: ${url}`);
      const response = await fetch(
        url,
        {
          method,
          headers,
          body,
        }
      );

      console.log(`url: ${url}, respCode: ${response.status}`);
      if (successCode.includes(response.status)) {
        // check response content type
        const contentType = response.headers.get('content-type');
        const respBody = (contentType.includes('application/json') ? await response.json() : await response.text());
        return this._generateResp(true, this.errorCode.NO_ERROR, '', respBody);
      } else {
        return this._generateResp(false, response.status, this.getErrorMessage(response.status).message, );
      }
    } catch (error) {
      console.log(`fetch url: ${url}, error: ${error}`);
    }
    return this._generateResp(false, this.errorCode.INTERNAL_ERROR, strings.error_internal);
  },

  _generateResp(success: boolean, errorCode: number, errorMessage: string, content: Object = {}): Object {
    return {
      success,
      errorCode,
      errorMessage,
      content
    };
  },

  getGoogleConfigure(): Object {
    let googleConfigure;
    if (Platform.OS === 'android') {
      googleConfigure = {
        webClientId: '831187067856-5bacrlo5jjqtsvsmke8p3gqod64ea5nm.apps.googleusercontent.com',
      };
    } else {
      googleConfigure = {
        webClientId: '831187067856-5bacrlo5jjqtsvsmke8p3gqod64ea5nm.apps.googleusercontent.com',
        iosClientId,
      };
    }
    return googleConfigure;
  },

  async handleLogout(actions: Object): Boolean {
    // FcmManager.clear();
    try {
      // GoogleSignin.configure((this.getGoogleConfigure()))
      //   .then(() => {
      //     this._timeoutID = setTimeout(() => {
      //       GoogleSignin.revokeAccess().then(() => GoogleSignin.signOut()).then(() => {
      //       });
      //     }, 1000);
      //   }).done();
      await GoogleSignin.configure(this.getGoogleConfigure());
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
    } catch (e) {
      console.log(e);
    }
    // signout facebook
    LoginManager.logOut();
    actions.reset();

    await NativeMqtt.set2v2_pro(true);
    console.log('Enter the version two.(Production version.)');
  },

  /* All request MUST contain cognito token */
  mod: {
    /* SERVER_HOST: 'https://uhsdrdcdp0.execute-api.us-east-2.amazonaws.com/dev',
    SERVICE_IMAGE_QUERY: '/api/v1/vtds/images/query',
    SERVICE_PAIR_CHECK: '/api/v1/vtds/vtdauthoritycheck',
    SERVICE_MAINTENANCE: '/api/v1/vtds/maintenance/query',

    getServiceURL(webService: string): string {
      return this.SERVER_HOST + webService;
    }, */

    async getResponse(url: string, method: string, body: ?string): Object {
      const accessToken = await this._getAccessToken();
      const accountEmail = await this._getEmail();
      const headers = {
        'token': accessToken,
        'email': accountEmail,
        'content-type' : RequestHelper.contentTypes.JSON,
        'accept': RequestHelper.contentTypes.JSON,
      };
      console.log(`myToken: ${accessToken}`);
      const resp = await RequestHelper.getResponse(url, method, body, headers, [200]);
      if (typeof resp.content.success === 'undefined') {
        const errCode = (resp.errorCode === this.errorCode.UNAUTHORIZED ? this.errorCode.UNAUTHORIZED : this.errorCode.INTERNAL_ERROR);
        return RequestHelper._generateResp(false, errCode, strings.error_internal);
      }
      if (resp.success && !resp.content.success) {
        resp.success = false;
        resp.errorCode = Number(resp.content.error); // sym server return in string
      }
      return resp;
    },

    async _getAccessToken(): Object {
      const settings = await AsyncStorage.getItem('reduxPersist:settings');// the key sync with redux-persist
      if (settings === '' || settings === null) {
        return '';
      } else {
        const json = JSON.parse(settings);
        return json.accessToken;
      }
    },

    async _getEmail(): Object {
      const settings = await AsyncStorage.getItem('reduxPersist:settings');// the key sync with redux-persist
      if (settings === '' || settings === null) {
        return '';
      } else {
        const json = JSON.parse(settings);
        return json.accountEmail;
      }
    },

  },

  getErrorMessage(errorCode: number | string): { title: string, message: string } {
    const errMsg = {};
    errMsg.title = strings.step_confirm;

    switch (Number(errorCode)) {
      case this.errorCode.NO_NETWORK:
        errMsg.title = strings.error_connection_title;
        errMsg.message = strings.error_no_network;
        break;
      case this.errorCode.NO_FCM_TOKEN:
        errMsg.title = strings.error_connection_title;
        errMsg.message = strings.error_no_fcm_token;
        break;
      case this.errorCode.INTERNAL_ERROR:
        errMsg.title = strings.error_connection_title;
        errMsg.message = strings.error_internal;
        break;
      case this.errorCode.FACE_BOOK_ERROR:
        errMsg.title = strings.error_connection_title;
        errMsg.message = strings.error_facebook;
        break;
      case this.errorCode.GOOGLE_ERROR:
        errMsg.title = strings.error_connection_title;
        errMsg.message = strings.error_google;
        break;
      case this.errorCode.UNAUTHORIZED:
        errMsg.message = strings.error_mod_token_expire;
        break;
      case this.errorCode.MOD_PARAMS_ERROR:
        errMsg.message = strings.error_invalid_parms;
        break;
      case this.errorCode.MOD_EMAIL_INVALID:
      case this.errorCode.MOD_TOKEN_INVALID:
      case this.errorCode.MOD_ADMINID_INVALID:
      case this.errorCode.MOD_ACCOUNT_LOGOUT:
        errMsg.message = `${strings.error_mod_token_expire} (${errorCode})`;
        break;
      case this.errorCode.MOD_CAR_CANNOT_GO:
        errMsg.message = strings.error_car_cannot_go;
        break;
      case this.errorCode.MOD_DATABASE_ERROR:
        errMsg.message = strings.error_database;
        break;
      case this.errorCode.MOD_SINGLE_FORMAT_ERROR:
        errMsg.message = strings.error_single_format;
        break;
      case this.errorCode.MOD_FACEBOOK_AUTH_FAIL:
        errMsg.message = strings.error_facebook_auth;
        break;
      case this.errorCode.MOD_GOOGLE_AUTH_FAIL:
        errMsg.message = strings.error_google_auth;
        break;
      case this.errorCode.MOD_MQTT_ERROR:
        errMsg.message = strings.error_mqtt;
        break;
      case this.errorCode.MOD_MUTI_LOGIN:
        errMsg.message = strings.error_muti_login;
        break;
      case this.errorCode.MOD_ACCOUNT_BUSY:
        errMsg.message = strings.error_account_busy;
        break;
      case this.errorCode.MOD_USER_CANNOT_CREATE_MORE_REQUEST:
        errMsg.message = strings.error_user_cannot_create_more_request;
        break;
      case this.errorCode.MOD_CAR_DISCONNECT_SOCKET:
        errMsg.message = strings.error_car_disconnect_socket;
        break;
      case this.errorCode.MOD_CANNOT_GET_EMAIL:
        errMsg.message = strings.error_cannot_get_email;
        break;
      case this.errorCode.MOD_CANNOT_CANCEL_REQUEST:
        errMsg.message = strings.error_cannot_cancel_request;
        break;
      case this.errorCode.MOD_CAR_CANNOT_CTL:
        errMsg.message = strings.error_cannot_control_car;
        break;
      case this.errorCode.MOD_REQUEST_SYSTEM_REJECT:
        errMsg.message = strings.error_rest_content;
        break;
      case this.errorCode.MOD_REQUEST_ADMIN_CANCEL:
        errMsg.message = strings.error_request_admin_cancel;
        break;
      case this.errorCode.MOD_REQUEST_ADMIN_NOT_LOGIN:
        errMsg.message = strings.admin_not_login;
        break;
      case this.errorCode.MOD_REQUEST_CAR_BUSY:
        errMsg.message = strings.error_request_not_create;
        break;
      case this.errorCode.SERVER_ACCOUNT_ERROR:
        errMsg.message = strings.error_invalid_account;
        break;
      case this.errorCode.SERVER_HTTP_ERROR:
        errMsg.message = strings.error_http;
        break;
      case this.errorCode.SERVER_DATA_ERROR:
        errMsg.message = strings.error_invalid_parms;
        break;
      case this.errorCode.SERVER_PARAMS_ERROR:
        errMsg.message = strings.error_invalid_parms;
        break;
      case this.errorCode.SERVER_ERROR:
        errMsg.message = strings.error_database;
        break;
      case this.errorCode.CAR_IS_NOT_READY:
        errMsg.message = strings.car_is_not_ready;
        break;
      case this.errorCode.REQUEST_NOT_IN_BUSINESS_HOURS:
        errMsg.message = strings.error_rest_content;
        break;
      case this.errorCode.REQUEST_USER_CANCEL:
        errMsg.message = strings.user_cancel;
        break;
      case this.errorCode.REQUEST_ADMIN_CANCEL:
        errMsg.message = strings.admin_cancel;
        break;
      case this.errorCode.REQUEST_NO_CAR_USED_TODAY:
        errMsg.message = strings.error_rest_content;
        break;
      case this.errorCode.REQUEST_SOMETHING_WRONG_WITH_CAR:
        errMsg.message = strings.car_is_not_ready;
        break;
    }
    return errMsg;
  },

  errorCode: {
    NO_ERROR: 0,
    INTERNAL_ERROR: -1,
    NO_NETWORK: 1,
    // below server error code
    FACE_BOOK_ERROR: 170,
    GOOGLE_ERROR: 180,
    UNAUTHORIZED: 401,
    CAR_IS_NOT_READY: 403,
    SERVER_ACCOUNT_ERROR: 404,
    SERVER_HTTP_ERROR: 405,
    SERVER_DATA_ERROR: 406,
    SERVER_PARAMS_ERROR: 422,
    SERVER_ERROR: 500,
    // mod
    MOD_PARAMS_ERROR: 900,
    MOD_EMAIL_INVALID: 901,
    MOD_TOKEN_INVALID: 902,
    MOD_ADMINID_INVALID: 903,
    MOD_ACCOUNT_LOGOUT: 904,
    MOD_CAR_CANNOT_GO: 905,
    MOD_DATABASE_ERROR: 906,
    MOD_SINGLE_FORMAT_ERROR: 907,
    MOD_FACEBOOK_AUTH_FAIL: 908,
    MOD_GOOGLE_AUTH_FAIL: 909,
    MOD_MQTT_ERROR: 910,
    MOD_MUTI_LOGIN:911,
    MOD_ACCOUNT_BUSY: 912,
    MOD_USER_CANNOT_CREATE_MORE_REQUEST: 913,
    MOD_CAR_DISCONNECT_SOCKET: 914,
    MOD_CANNOT_GET_EMAIL: 915,
    MOD_CANNOT_CANCEL_REQUEST: 916,
    MOD_CAR_CANNOT_CTL: 999,

    // request State
    MOD_REQUEST_SYSTEM_REJECT: 102,
    MOD_REQUEST_ADMIN_CANCEL: 109,
    MOD_REQUEST_ADMIN_NOT_LOGIN: 111,
    MOD_REQUEST_CAR_BUSY: 112,

    // detail content of 999 error code
    REQUEST_NOT_IN_BUSINESS_HOURS: 9001,
    REQUEST_USER_CANCEL: 9002,
    REQUEST_ADMIN_CANCEL: 9003,
    REQUEST_NO_CAR_USED_TODAY: 9004,
    REQUEST_SOMETHING_WRONG_WITH_CAR: 9005,
  },

  contentTypes: {
    FORM: 'application/x-www-form-urlencoded',
    JSON: 'application/json',
  },
};

module.exports = RequestHelper;
