package com.acer.android.mod.rn;

import android.support.annotation.Nullable;

import com.acer.android.mod.MainApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;

import static com.facebook.react.bridge.UiThreadUtil.runOnUiThread;

public final class RN {
    /*
        listen onConnectionStateChanged, and get response : { isPaired : 0 or 1, status: 0 or 2 }
    */
    public static final String EVENTNAME_MQTT_MESSAGE_EVENT = "onMqttMessageEvent";

    // Service connect status
    public static final int CONNECTION_STATE_DISCONNECTED = 0;
    public static final int CONNECTION_STATE_CONNECTED = 2;

    private static RN sInstance;
    private MainApplication mApp;

    private RN(MainApplication app) {
        mApp = app;
    }

    private ReactContext getContext() {
        final ReactInstanceManager reactInstanceManager = mApp.getReactNativeHost().getReactInstanceManager();
        return reactInstanceManager.getCurrentReactContext();
    }

    public void sendEvent(final String eventName, final @Nullable WritableMap params) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ReactContext c = getContext();
                if (c != null)
                c.getJSModule(RCTNativeAppEventEmitter.class).emit(eventName, params);
            }
        });
    }

    public void sendEvent(final String eventName, final int status) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ReactContext c = getContext();
                if (c != null)
                c.getJSModule(RCTNativeAppEventEmitter.class).emit(eventName, status);
            }
        });
    }

    public synchronized static RN init(MainApplication app) {
        if (sInstance == null) {
            sInstance = new RN(app);
        }
        return sInstance;
    }


    public synchronized static RN instance() {
        return sInstance;
    }

}
