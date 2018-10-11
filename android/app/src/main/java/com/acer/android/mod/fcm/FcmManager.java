package com.acer.android.mod.fcm;

import android.content.Context;
import android.os.Handler;
import android.text.TextUtils;
import android.util.Log;

import com.acer.android.mod.db.SharedPrefHelper;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.firebase.iid.FirebaseInstanceId;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nullable;

public class FcmManager extends ReactContextBaseJavaModule {
    private static final String TAG = FcmManager.class.getSimpleName();
    public static final String EVENT_ON_PUSHNOTIFICATION_RECEIVED = "onPushNotificationReceived";
    int t = 0;
    String token = "";
    final Context context = getReactApplicationContext();
    Handler handler;

    public FcmManager(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "FcmManager";
    }

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("EVENT_ON_PUSHNOTIFICATION_RECEIVED", EVENT_ON_PUSHNOTIFICATION_RECEIVED);
        return constants;
    }

    // This method should called after login
    @ReactMethod
    public void scheduleToSendToken() {
        UploadTokenJob.scheduleForUpload(getReactApplicationContext());
    }

    // This method should called when logout
    @ReactMethod
    public void clear() {
        Log.i(TAG, "Clear");
        Context context = getReactApplicationContext();
        // UploadTokenJob.cancelJob(context);
        SharedPrefHelper.removeKey(context, SharedPrefHelper.FCM_TOKEN_KEY);

        // Revokes the token
        try {
            FirebaseInstanceId.getInstance().deleteInstanceId();
        } catch (IOException e) {
            Log.w(TAG, "An error occur when revoke token", e);
        }
    }

    @ReactMethod
    public void getFCMToken(Promise promise) {
        Context context = getReactApplicationContext();
        String token = SharedPrefHelper.getString(context, SharedPrefHelper.FCM_TOKEN_KEY, "");
        Log.d(TAG, "getFCMToken fcmToken: " + token);
        promise.resolve(token);
    }

    Runnable runnable = new Runnable() {
        @Override
        public void run() {
            t++;
            token = FirebaseInstanceId.getInstance().getToken();
            Log.d(TAG, "refetch " + t + " from FirebaseInstanceId: " + token);
            if (!TextUtils.isEmpty(token)) {
                SharedPrefHelper.saveString(context, SharedPrefHelper.FCM_TOKEN_KEY, token);
            }
            if (TextUtils.isEmpty(token) && t<3) {
                handler.postDelayed(this, 2000);
            } else {
                handler.removeCallbacks(this);
            }
        }
    };

    @ReactMethod
    public void refreshFCMToken() {
        token = SharedPrefHelper.getString(context, SharedPrefHelper.FCM_TOKEN_KEY, "");
        Log.d(TAG, "refreshFCMToken FirebaseInstanceId: " + token);
        if (TextUtils.isEmpty(token)) {
            t = 0;
            handler = new Handler();
            handler.postDelayed(runnable, 1000);
        }
    }
}
