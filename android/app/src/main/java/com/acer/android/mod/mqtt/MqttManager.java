package com.acer.android.mod.mqtt;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.IBinder;
import android.support.v4.app.NotificationCompat;
import android.util.Log;

import com.acer.android.mod.db.SharedPrefHelper;
import com.acer.android.mod.debug.L;
import com.acer.android.mod.MainActivity;
import com.acer.android.mod.R;
import com.acer.android.mod.Util;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;


import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nullable;

public class MqttManager extends ReactContextBaseJavaModule {
    private static final String TAG = MqttManager.class.getSimpleName();

    private MqttService mService;
    private final ReactApplicationContext mContext;
    private static final int mNotificationId = 666;

    public MqttManager(ReactApplicationContext reactContext) {
        super(reactContext);
        mContext = reactContext;
        Context ctx = reactContext.getApplicationContext();
        initService(ctx);
    }

    private void initService(Context ctx) {
        Intent intent = new Intent(ctx, MqttService.class);
        ctx.startService(intent);
        ctx.bindService(intent, mServiceConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    public String getName() {
        return "MqttManager";
    }

    @ReactMethod
    public void set2v2_pro(boolean v2) {
        if (mService != null) {
          //mService.setMqttServer2v2(false);
          mService.setMqttServer2v2_pro(v2);
          L.d("set Mqtt server to V2 (Production):" + v2);
        }
    }

    @ReactMethod
    public boolean subscribe(String topicName, int qos) {
      return MqttHandler.getInstance().subscribe(topicName, qos);
    }

    public boolean publish(String topicName, int qos, byte[] payload) {
      return MqttHandler.getInstance().publish(topicName, qos, payload);
    }

    @ReactMethod
    public void sendRequestNotification() {
      Intent resultIntent = new Intent(mContext, MainActivity.class);

      PendingIntent resultPendingIntent =
              PendingIntent.getActivity(
                      mContext,
                      0,
                      resultIntent,
                      PendingIntent.FLAG_UPDATE_CURRENT
              );
      Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
      NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(
              mContext).setSmallIcon(R.mipmap.ic_directions_car_n)
              .setContentTitle(mContext.getResources().getString(R.string.drive_car_title))
              .setContentText(mContext.getResources().getString(R.string.admin_receive_new_request))
              .setContentIntent(resultPendingIntent)
              .setSound(uri)
              .setDefaults(Notification.DEFAULT_ALL)
              .setPriority(Notification.PRIORITY_HIGH)
              .setVibrate(new long[0])
              .setAutoCancel(true);
      NotificationManager manager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
      manager.notify(mNotificationId, mBuilder.build());
    }

    @ReactMethod
    public void setAccountType(String type) {
      SharedPrefHelper.saveString(mContext, Util.ADMIN_ACCOUNT_KEY, type);
    }

    /**
     * Implement service connection (local binder).
     */
    private final ServiceConnection mServiceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName componentName, IBinder service) {
            L.d("onServiceConnected");
            mService = ((MqttService.MyBinder) service).getService();
        }
        @Override
        public void onServiceDisconnected(ComponentName componentName) {
            mService = null;
        }
    };
}
