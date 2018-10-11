package com.acer.android.mod.fcm;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.acer.android.mod.MainApplication;
import com.acer.android.mod.rn.RN;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.common.LifecycleState;
import com.google.firebase.messaging.RemoteMessage;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class MessageHandler {
    private static final String TAG = MessageHandler.class.getSimpleName();

    static final String FROM_REMOTE_FOREGROUND = "fcm:remote_foreground";
    static final String FROM_REMOTE_BACKGROUND = "fcm:remote_background";
    static final String FROM_INTENT = "fcm:intent";

    /* JS Event Message Type, for ui to handle */
    static final String MSG_TYPE_DIALOG = "dialog";
    static final String MSG_TYPE_LINK = "link";

    /* handle type */
    static final String HANDLE_NONE = "fcm:handle_none";
    static final String HANDLE_JS_EVENT = "fcm:handle_js_event";
    static final String HANDLE_NOTIFICATION = "fcm:handle_local_notification";

    private Context mContext;

    private MessageHandler() {}
    private MessageHandler(Context context) {
        this.mContext = context;
    }

    public static MessageHandler get(Context context) {
        return new MessageHandler(context);
    }

    public void handle(RemoteMessage remoteMessage) {
        Log.i(TAG, "Start to handle a message from remote message");
        Map<String, String> datas = remoteMessage.getData();
        if (datas.size() > 0) {
            handleMessage(datas, isAppForeground() ? FROM_REMOTE_FOREGROUND : FROM_REMOTE_BACKGROUND);
        } else {
            Log.w(TAG, "This message does not contain data property");
        }
    }

    public void handle(Intent intent) {
        Log.i(TAG, "Start to handle a message from intent");
        Bundle extras = intent.getExtras();
        if (extras != null) {
            if (extras.containsKey("type")) {
                Map<String, String> datas = new HashMap<>();
                final Set<String> keySet = extras.keySet();
                for (final String key: keySet) {
                    Object obj = extras.get(key);
                    if (obj instanceof String) {
                        datas.put(key, (String) obj);
                    }
                }
                handleMessage(datas, FROM_INTENT);
            }
        }
    }

    private boolean isAppForeground() {
        MainApplication application = (MainApplication) mContext.getApplicationContext();
        if (application.getReactNativeHost().hasInstance()) {
            ReactInstanceManager instanceManager = application.getReactNativeHost().getReactInstanceManager();
            LifecycleState state = instanceManager.getLifecycleState();
            return LifecycleState.RESUMED == state;
        } else {
            return false;
        }
    }

    private void handleMessage(Map<String, String> message, String from) {
        FcmMessage.FcmClient fcmClient = FcmMessage.get(message, from);
        Log.i(TAG, "Handle: " + fcmClient.getDescription());

        switch (fcmClient.getHandleType()) {
            case HANDLE_JS_EVENT:
                RN.instance().sendEvent(FcmManager.EVENT_ON_PUSHNOTIFICATION_RECEIVED, fcmClient.getEventBody());
                break;
            case HANDLE_NOTIFICATION:
                Notification notification = fcmClient.getNotificationBody(mContext);
                if (notification != null) {
                    NotificationManager manager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
                    manager.notify((int) System.currentTimeMillis(), notification);
                }
                break;
        }
    }
}
