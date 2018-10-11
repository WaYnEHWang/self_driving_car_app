package com.acer.android.mod.fcm;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.os.Handler;
import android.text.TextUtils;
import android.util.Log;

import com.acer.android.mod.db.SharedPrefHelper;
import com.google.firebase.iid.FirebaseInstanceId;

import java.util.List;

public class UploadTokenJob extends JobService {
    private static final String TAG = UploadTokenJob.class.getSimpleName();
    private static final int JOB_ID = 100001;
    private static final int BACK_OFF_TIME = 5 * 60 * 1000;

    private Handler mHandler;

    public static void scheduleForUpload(Context context) {
        Log.d(TAG, "scheduler to upload");
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(context, UploadTokenJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setMinimumLatency(0)
                .setOverrideDeadline(1000)
                .setBackoffCriteria(BACK_OFF_TIME, JobInfo.BACKOFF_POLICY_LINEAR)
                .setPersisted(true)
                .build();
        JobScheduler jobScheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        jobScheduler.schedule(job);
    }

    public static void cancelJob(Context context) {
        JobScheduler jobScheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        jobScheduler.cancel(JOB_ID);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mHandler = new Handler();
    }

    private String ensureGetToken() {
        String token = SharedPrefHelper.getString(getBaseContext(), SharedPrefHelper.FCM_TOKEN_KEY, "");
        if (TextUtils.isEmpty(token)) {
            token = FirebaseInstanceId.getInstance().getToken();
            SharedPrefHelper.saveString(getBaseContext(), SharedPrefHelper.FCM_TOKEN_KEY, token);
            Log.d(TAG, "Not fetch token after login, refetch from FirebaseInstanceId: " + token);
        }
        return token;
    }

    @Override
    public boolean onStartJob(final JobParameters jobParams) {
        mHandler.post(new Runnable() {
            @Override
            public void run() {
                String token = ensureGetToken();

                if (!TextUtils.isEmpty(token)) {
                  Log.i(TAG, "Send token success!!");
                  jobFinished(jobParams, false);
                    /* update token to server */
                } else {
                    Log.w(TAG, "Token is empty, may wait for onTokenRefresh to trigger...");
                    jobFinished(jobParams, false);
                }
            }
        });

        return true;
    }

    @Override
    public boolean onStopJob(JobParameters jobParameters) {
        mHandler.removeCallbacksAndMessages(null);
        return false;
    }
}
