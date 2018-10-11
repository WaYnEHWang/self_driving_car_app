package com.acer.android.mod.mqtt;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Binder;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Process;
import android.support.v4.app.NotificationCompat;
import android.util.Log;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.greenrobot.eventbus.ThreadMode;

import java.util.UUID;

import com.acer.android.mod.MainActivity;
import com.acer.android.mod.db.SharedPrefHelper;
import com.acer.android.mod.R;
import com.acer.android.mod.rn.RN;
import com.acer.android.mod.Util;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class MqttService extends Service {
    private static final String TAG = Util.TAG;
    private static final int mNotificationId = 666;
    private Handler mHandler;
    private HandlerThread mThread;
    private boolean mbMqttConnected = false;
    private boolean isV2_pro = true;

    public MyBinder myBinder = new MyBinder();

    public class MyBinder extends Binder {
        public MqttService getService() {
            return MqttService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "### MqttService onCreate");
        String isV2_pro_str = SharedPrefHelper.getString(getBaseContext(), Util.IS_PRO_KEY, "true");
        isV2_pro = Boolean.valueOf(isV2_pro_str);
        Log.d(TAG, "### MqttService onCreate is pro: " + isV2_pro);
        EventBus.getDefault().register(this);
        mThread = new HandlerThread(MqttService.class.getSimpleName(), Process.THREAD_PRIORITY_DEFAULT);
        mThread.start();
        mHandler = new Handler(mThread.getLooper());
        mHandler.post(createConnectRunnable);
    }

    private final Runnable createConnectRunnable = new Runnable() {
        public void run() {
            String uniqueId = UUID.randomUUID().toString();
            Log.d(TAG, "### createConnectRunnable V2: is pro? " + isV2_pro);
            mbMqttConnected = MqttHandler.getInstance().createConnect((isV2_pro) ? Util.AWS_MQTT_URL_V2 : Util.LOCAL_MQTT_URL_V2, Util.MQTT_USER_NAME_V2, Util.MQTT_PASSWORD_V2, uniqueId);
            Log.d(TAG, "### is mqtt Connected: " + mbMqttConnected + " , uniqueId : " + uniqueId);
            if (!mbMqttConnected) {
                MessageEvent msg = new MessageEvent();
                msg.title = MessageEvent.Event_Title_Connect;
                msg.topic = Util.MQTT_REQUEST_TOPIC;
                msg.content = "disconnected";
                EventBus.getDefault().post(msg);
                mHandler.removeCallbacks(createConnectRunnable);
                mHandler.postDelayed(createConnectRunnable, 3000);
                return;
            }
            MessageEvent msg = new MessageEvent();
            msg.title = MessageEvent.Event_Title_Connect;
            msg.topic = Util.MQTT_REQUEST_TOPIC;
            msg.content = "connected";
            EventBus.getDefault().post(msg);
        }
    };

    @Subscribe(threadMode = ThreadMode.MAIN)
    public void onEventBusService(MessageEvent message) {
        Log.d(TAG, "### onEventBusService: " + message.title + " : " + message.content);
        switch (message.title) {
            case MessageEvent.Event_Title_Conn_Lost:
                Log.d(TAG, "### Conn Lost : " + message.content);
                mbMqttConnected = false;
                mHandler.removeCallbacks(createConnectRunnable);
                mHandler.postDelayed(createConnectRunnable, 3000);
                break;

            case MessageEvent.Event_Title_Subscribe:
                Log.d(TAG, "### Subscribe:" + message.topic + " : " + message.content);
                if (message.topic.contains(Util.MQTT_REQUEST_TOPIC)) {
                    String[] requestSplit = message.topic.split("/");
                    if (message.content.equals(Util.REQ_STATUS_START) && requestSplit[2].equals(Util.REQ_REQUEST_STATUS)) {
                        String account = SharedPrefHelper.getString(getBaseContext(), Util.ADMIN_ACCOUNT_KEY, "");
                        if (account.length() > 0) {
                            startNotification(getResources().getString(R.string.drive_car_msg));
                        } else {
                            startNotification(getResources().getString(R.string.drive_car_user_msg));
                        }
                    } else if (message.content.equals(Util.REQ_STATUS_USER_CANCEL) && requestSplit[2].equals(Util.REQ_REQUEST_STATUS)) {
                        String account = SharedPrefHelper.getString(getBaseContext(), Util.ADMIN_ACCOUNT_KEY, "");
                        if (account.length() > 0) {
                            startNotification(getResources().getString(R.string.admin_cancel_order_title));
                        }
                    } else if (message.content.equals(Util.REQ_STATUS_END) && requestSplit[2].equals(Util.REQ_REQUEST_STATUS)) {
                        startNotification(getResources().getString(R.string.order_status_end));
                    }
                }
                break;
        }
        if ((message.topic != null && !message.topic.isEmpty() &&
            message.content != null && !message.content.isEmpty()) ||
            message.content.equals("connected") ||
            message.content.equals("disconnected")) {
            WritableMap map = Arguments.createMap();
            map.putString("title", message.title);
            map.putString("topic", message.topic);
            map.putString("content", message.content);
            RN.instance().sendEvent(RN.EVENTNAME_MQTT_MESSAGE_EVENT, map);
        }
    }

    private void startNotification(String contentText) {
        Intent resultIntent = new Intent(this, MainActivity.class);

        PendingIntent resultPendingIntent =
                PendingIntent.getActivity(
                        this,
                        0,
                        resultIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT
                );
        Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(
                getApplicationContext()).setSmallIcon(R.mipmap.ic_directions_car_n)
                .setContentTitle(getResources().getString(R.string.drive_car_title))
                .setContentText(contentText)
                .setContentIntent(resultPendingIntent)
                .setSound(uri)
                .setAutoCancel(true);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(mNotificationId, mBuilder.build());
    }

    @Override
    public IBinder onBind(Intent intent) {
        Log.d(TAG, "### MqttService onBind");

        return myBinder;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        Log.d(TAG, "### MqttService onUnbind");
        return super.onUnbind(intent);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "### MqttService onStartCommand");
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        mHandler.removeCallbacksAndMessages(null);
        mThread.quit();
        super.onDestroy();
        MqttHandler.release();
        EventBus.getDefault().unregister(this);
        Log.d(TAG, "### MqttService onDestroy");
    }

    public boolean getMqttConnected() {
        Log.d(TAG, "### MqttService getMqttConnected : " + mbMqttConnected);
        return mbMqttConnected;
    }

    public void reConnectMqttServer() {
        Log.d(TAG, "### re Connect MqttServer ");
        MqttHandler.release();
        mHandler.removeCallbacks(createConnectRunnable);
        mHandler.postDelayed(createConnectRunnable, 100);
    }

    public void setMqttServer2v2_pro(boolean v2) {
        Log.d(TAG, "### re Connect to MqttServer V2 (Production): " + v2);
        isV2_pro = v2;
        SharedPrefHelper.saveString(getBaseContext(), Util.IS_PRO_KEY, String.valueOf(isV2_pro));
        reConnectMqttServer();
    }

}
