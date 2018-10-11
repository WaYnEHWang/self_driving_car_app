package com.acer.android.mod;

import android.util.Log;

public class Util {
    public static final String TAG = "mod_ap";
    public static final boolean News = true;
    public static final boolean AWS = false;
    public static final float POPUPWINDOW_WIDTH_RATIO = 0.9f;

    public static final String SHARED_PRE_ORDER_NAME = "orders_info";
    public static final String MY_ORDER_LIST_KEY = "my_order_list";
    public static final String ADMIN_ACCOUNT_KEY = "admin_account";
    public static final String ADMIN_DATE_KEY = "admin_date";
    public static final String IS_PRO_KEY = "is_pro";

    public static final int TIMEOUT = 12000;

    // for MQTT settings
    public static final String LOCAL_MQTT_URL_V2 = "tcp://labmqtt.sdc-acer.com:1883";
    public static final String LOCAL_MQTT_URL_V1 = "tcp://10.36.162.242:1883";
    public static final String AWS_MQTT_URL_V1 = "tcp://mqtt.sdc-acer.com:1883";
    public static final String AWS_MQTT_URL_V2 = "tcp://mqttv2.sdc-acer.com:1883";
    public static String MQTT_URL = AWS_MQTT_URL_V1; // LOCAL_MQTT_URL;
    public static final String MQTT_USER_NAME_V2 = "superadmin";
    public static final String MQTT_PASSWORD_V2 = "JUYyPyyEKS";
    public static final String MQTT_USER_NAME_V1 = "admin";
    public static final String MQTT_PASSWORD_V1 = "1qaz2wsx";
    public static String MQTT_USER_NAME = (MQTT_URL == LOCAL_MQTT_URL_V2 || MQTT_URL == AWS_MQTT_URL_V2 ) ? MQTT_USER_NAME_V2 : MQTT_USER_NAME_V1;
    public static String MQTT_PASSWORD = (MQTT_URL == LOCAL_MQTT_URL_V2 || MQTT_URL == AWS_MQTT_URL_V2 ) ? MQTT_PASSWORD_V2 : MQTT_PASSWORD_V1;
    public static final String MQTT_REQUEST_ADMIN = "admin/";
    public static final String MQTT_REQUEST_TOPIC = "request/";
    public static final String MQTT_CAR_TOPIC = "car/";
    public static final String MQTT_SUBSCRIBE_ALL = "#";

    // for Web api
    public static final String LOCAL_WAPI_URL = "http://10.36.162.193/SDCMOD/webservice/webapi/v1/";
    public static final String AWS_WAPI_URL = "https://www.sdc-acer.com/SDCMOD/webservice/webapi/v1/";
    public static String WAPI_URL = AWS_WAPI_URL;
    public static final String WAPI_REQ_ORDER_CREATE = "requestorder/create";
    public static final String WAPI_REQ_ADMIN_LOGIN = "admin/login";
    public static final String WAPI_REQ_ADMIN_LOGOUT = "admin/logout";
    public static final String WAPI_REQ_ORDER_CONFIRM = "requestorder/confirm";
    public static final String WAPI_REQ_DRIVE_CONFIRM = "car/nextstep/confirm";
    public static final String WAPI_REQ_USER_CANCEL = "user/cancel";
    public static final String WAPI_REQ_ADMIN_CLOSE_USER_CANCEL = "requestorder/user_cancel/close";
    public static final String WAPI_REQ_ADMIN_INTERRUPT = "admin/interrupt";
    public static final String WAPI_REQ_MAP_STATION_DATA = "user/getinfo";

    public static final String REQ_ORDER_CONFIRM_NO = "0";
    public static final String REQ_ORDER_CONFIRM_YES = "1";

    public static final String REQ_DRIVE_CONFIRM_ERROR = "999";

    //for request topic
    public static final String REQ_START = "start";
    public static final String REQ_END = "end";
    public static final String REQ_PEOPLE = "people";
    public static final String REQ_ARRIVALTIME = "arrivaltime";
    public static final String REQ_CARID = "carid";
    public static final String REQ_REQUEST_STATUS = "requeststatus";
    public static final String REQ_ADMIN_ID = "adminid";
    public static final String REQ_RESPONSE_1 = "response1";
    public static final String REQ_RESPONSE_2 = "response2";
    public static final String REQ_CANCEL = "cancel";
    public static final String REQ_REMARKS = "remarks";
    public static final String REQ_CREATE_TIME = "createtime";

    //for car topic
    public static final String CAR_POSITION = "position";

    //for request topic requeststatus
    public static final String REQ_STATUS_WAIT_REPLY = "100";
    public static final String REQ_STATUS_ACCEPT = "101";
    public static final String REQ_STATUS_REJECT = "102";
    public static final String REQ_STATUS_TO_START = "103";
    public static final String REQ_STATUS_START = "104";
    public static final String REQ_STATUS_TO_END = "105";
    public static final String REQ_STATUS_END = "106";
    public static final String REQ_STATUS_TO_GARAGE = "107";
    public static final String REQ_STATUS_CLOSE = "108";
    public static final String REQ_STATUS_USER_CANCEL = "110";

    public static void setServerEnvironment(boolean aws) {
        /* if (aws) {
            WAPI_URL = AWS_WAPI_URL;
            MQTT_URL = AWS_MQTT_URL;
        } else {
            WAPI_URL = LOCAL_WAPI_URL;
            MQTT_URL = LOCAL_MQTT_URL;
        }
        Log.d(TAG, "set aws Server Environment : " + aws); */
    }

    public static double stringToDouble(String strNum) {
        double dNum = 0.0f;
        try {
            dNum = Double.parseDouble(strNum);
        } catch (NumberFormatException ex) {
            Log.e(TAG, "########## NumberFormatException:" + ex.toString());
        }
        return dNum;
    }
}
