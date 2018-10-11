package com.acer.android.mod.debug;

import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;

public class L {
    private static final int VERBOSE = 2;
    private static final int DEBUG = 3;
    private static final int INFO = 4;
    private static final int WARN = 5;
    private static final int ERROR = 6;
    private static final int ASSERT = 7;
    private static final boolean DEBUG_MODE = true;
    private static final String PROJECT_NAME = "Scooter";

    static public void v(String info) {
        out(VERBOSE, info);
    }

    static public void d(String info) {
        // if debug == false
        if (DEBUG_MODE) {
            out(DEBUG, info);
        }
    }

    static public void i(String info) {
        out(INFO, info);
    }

    static public void w(String info) {
        out(WARN, info);
    }

    static public void e(String info) {
        out(ERROR, info);
    }

    static public void wtf(String info) {
        out(ASSERT, info);
    }

    private static String tId() {
        boolean uiT = Looper.myLooper() == Looper.getMainLooper();
        int tId = android.os.Process.myTid();
        return uiT ? "MID-" + tId : "TID-" + tId;
    }

    private static void out(int LEVEL, String fmt) {
        if (TextUtils.isEmpty(fmt)) {
            fmt = "";
        }
        StackTraceElement st = new RuntimeException().getStackTrace()[2];
        String className = st.getClassName();
        int i = className.lastIndexOf(".") + 1;
        String s = "[" + className.substring(i) + "(" + st.getLineNumber() + ")" + " | " + tId() + "] " + fmt;
        String pid = "[" + android.os.Process.myPid() + "]";
        logcat(PROJECT_NAME, LEVEL, pid+s);
    }


    private static void logcat(String TAG, int LEVEL, String s) {
        switch (LEVEL) {
            case VERBOSE:
                Log.v(TAG, s);
                return;
            case DEBUG:
                Log.d(TAG, s);
                return;
            case INFO:
                Log.i(TAG, s);
                return;
            case WARN:
                Log.w(TAG, s);
                return;
            case ERROR:
                Log.e(TAG, s);
                return;
            case ASSERT:
                Log.wtf(TAG, s);
        }
    }


    public static void printStack(int length) {
        StackTraceElement[] ste = Thread.currentThread().getStackTrace();
        for (int i = 0; i < ((length > ste.length) ? ste.length : length); i++) {
            out(INFO, "<" + i + "> :" + ste[i]);
        }
    }

}
