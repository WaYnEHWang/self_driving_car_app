/* @flow */
// eslint-disable-next-line import/no-extraneous-dependencies
import LocalizedStrings from 'react-native-localization';

import zhTW from './zh-TW';

const strings = new LocalizedStrings({
  'zh': zhTW,
  // 'zh-Hant': zhTW, // for iOS compatible
  en: {
    // --- Used in RN & Android --- Start ---
    app_name: 'MoD',

    // error string
    error_title: 'Invalid',
    error_connection_title: 'Connection Failed',
    error_no_network: 'no network',
    error_no_fcm_token: 'FCM service not ready. Please try again later',
    error_internal: 'Failed to connect to server. Please try again later.',
    error_invalid_parms: 'invalid parms',

    error_facebook: 'FBLogin failed',
    error_google: 'GoogleLogin failed or Google service error',
    error_mod_token_expire: 'Identity token has expired',
    error_start_point: 'Please select your pick up site',
    error_end_point: 'Please choose your terminal',
    error_car_cannot_go: 'It is not allowed to press the go button now',
    error_database: 'Update database failed, Please try again later.',
    error_single_format: 'Single number format is a problem, Please try again later.',
    error_facebook_auth: 'An error occurred in Facebook authentication, Please try again later.',
    error_google_auth: 'An error occurred in Google authentication, Please try again later.',
    error_mqtt: 'Mqtt occurred an error, Please try again later.',
    error_muti_login: 'This account repeated login',
    error_account_busy: 'This account is performing tasks and can not logout',
    error_user_cannot_create_more_request: 'The user has a request is currently being implemented',
    error_cannot_control_car: 'Cannot control the car',
    error_request_not_create: 'The request was not set up. The car is currently in the mission, Please try again later.',
    error_request_admin_cancel: 'The requesr is canceled, Please try again later.',
    error_cannot_get_email: 'Cannot get the email infromation from social network',
    error_cannot_cancel_request: 'This request can not be canceled now',
    error_car_disconnect_socket: 'The car is not connected to Socket',
    error_rest_content: 'Not yet operational, please try again later',
    error_invalid_account: 'This account is invalid',
    error_http: 'HTTP method is error.',

    // Main Page
    request: 'Request',
    share_car: 'Share Car',
    pick_up: 'Pick Up Time',
    passenger: 'Passenger',
    normal_operation: 'Normal Operation',
    rest: 'No Service',
    start_point: 'Start point',
    end_point: 'End Point',
    logout: 'Logout',
    send_request: 'Send request',
    step_one:'Set boarding',
    step_two: 'Set alighting',
    step_three: 'Set passengers',
    step_confirm: 'Confirm',

    // My Request MainPage
    my_request: 'My Request',
    add_request: 'Add Request',
    pickup_time: 'Pickup Time',
    waiting_for_reply: 'Waiting for reply',
    server_accept: 'Request confirmed',
    server_reject: 'Request not set up',
    to_start: 'Go to the start point',
    car_start:'Arrived at the start point, please get on the car',
    to_end: 'Go to the end point',
    car_end: 'Arrival at the end, welcome to take the ride again',
    to_garage: 'Go to the garage',
    request_close: 'Request completed',
    admin_cancel: 'Admin cancel the request',
    user_cancel: 'Request canceled',
    waiting_for_procrssing: 'Waiting for processing',
    car_go: 'Go',
    get_off: 'Get off the car',
    get_on: 'Get on the car already, Go',
    user_cancel_alert: 'Cancel the request?',
    qrcode_title:'Please scan the QR code.',
    qrcode_correct_title: 'Correct',
    qrcode_correct_content: 'The car has been checked.',
    qrcode_wrong_title: 'Wrong',
    qrcode_wrong_content: 'It is not the right car.',
    qrcode_check: 'Use the QR code scanner to check the car',

    // Admin Request
    admin: 'Admin',
    departure: '發車',
    driving_info: '行車資訊',
    request_list: '所有訂單',
    path: '停靠站',
    go_to: '前往',
    end_stop: '終點站',
    empty_seats: '空位',
    status: '狀態',
    interrupt: '中斷服務',
    car_status: '車輛狀態',
    admin_status: 'Admin狀態',
    press_go: '請按發車',
    request_id: 'id',
    request_status: 'status',
    car_id: 'carID',

    // Login
    sign_in_with: 'Sign in with',
    eula_content: '  Terms of use apply. Acer will collecr your personal data tpo provide the service. Acer will handle your data per our privacy policy.',
    check_eula: 'I have read and agree to the https://eula and http://www.acer-group.com/public/index/privacy.htm.',
    eula: 'End User License Agreement',
    acer_privacy: 'Acer Privacy Policy',
    close: 'Close',
    agree: 'Agree',
    car_is_not_ready: 'Car is not ready',

    // request status
    admin_not_login: 'Admin is not online',
    car_busy: 'Car is busy',

    // Permission
    req_location_permission_title: 'Can we access your location?',
    req_location_permission_content: 'We need access to get your current location',
    req_permission_denied: 'No',
    cancel: 'Cancel',
    ok: 'OK',

    error_address_not_in_boundary: 'Input address not in our service',
  },
});

module.exports = strings;
