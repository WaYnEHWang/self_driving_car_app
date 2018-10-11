package com.acer.android.mod.fcm;

import android.util.Log;

import com.acer.android.mod.db.SharedPrefHelper;
import com.google.firebase.iid.FirebaseInstanceId;
import com.google.firebase.iid.FirebaseInstanceIdService;

public class InstanceIDService extends FirebaseInstanceIdService {
    private static final String TAG = InstanceIDService.class.getSimpleName();

    @Override
    public void onTokenRefresh() {
        String token = FirebaseInstanceId.getInstance().getToken();
        Log.d(TAG, "onTokenRefresh: " + token);
        SharedPrefHelper.saveString(getBaseContext(), SharedPrefHelper.FCM_TOKEN_KEY, token);
        String tokenId = SharedPrefHelper.getString(getBaseContext(), SharedPrefHelper.FCM_TOKEN_KEY, "");
        Log.d(TAG, "onTokenRefresh getTokenId: " + tokenId);
        // UploadTokenJob.scheduleForUpload(getBaseContext());
    }
}
