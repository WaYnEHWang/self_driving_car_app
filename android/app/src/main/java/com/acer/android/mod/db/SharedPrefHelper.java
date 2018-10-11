package com.acer.android.mod.db;

import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;

// import com.google.gson.Gson;
// import com.google.gson.JsonSyntaxException;

import java.lang.reflect.Type;

public final class SharedPrefHelper {
    public static final String FCM_TOKEN_KEY = "fcm_token";

    public static boolean saveString(Context context, String key, String val) {
        SharedPreferences.Editor editor = PreferenceManager.getDefaultSharedPreferences(context).edit();
        editor.putString(key, val);
        return editor.commit();
    }

    public static boolean saveInt(Context context, String key, int val) {
        SharedPreferences.Editor editor = PreferenceManager.getDefaultSharedPreferences(context).edit();
        editor.putInt(key, val);
        return editor.commit();
    }

    public static boolean saveLong(Context context, String key, long val) {
        SharedPreferences.Editor editor = PreferenceManager.getDefaultSharedPreferences(context).edit();
        editor.putLong(key, val);
        return editor.commit();
    }

    /*public static boolean saveJSON(Context context, String key, Object obj) {
        Gson gson = new Gson();
        String jsonString = gson.toJson(obj);
        return saveString(context, key, jsonString);
    }

    public static boolean saveJSON(Context context, String key, Object src, Type typeOfSrc) {
        Gson gson = new Gson();
        String jsonString = gson.toJson(src, typeOfSrc);
        return saveString(context, key, jsonString);
    }*/

    public static String getString(Context context, String key, String defVal) {
        return PreferenceManager.getDefaultSharedPreferences(context).getString(key, defVal);
    }

    public static int getInt(Context context, String key, int defVal) {
        return PreferenceManager.getDefaultSharedPreferences(context).getInt(key, defVal);
    }

    public static long getLong(Context context, String key, long defVal) {
        return PreferenceManager.getDefaultSharedPreferences(context).getLong(key, defVal);
    }

    /* public static <T> T getObj(Context context, String key, Class<T> classOfT) {
        String jsonString = getString(context, key, "");
        Gson gson = new Gson();
        try {
            return gson.fromJson(jsonString, classOfT);
        } catch (JsonSyntaxException e) {
            return null;
        }
    }

    public static <T> T getObj(Context context, String key, Type typeOfT) {
        String jsonString = getString(context, key, "");
        Gson gson = new Gson();
        try {
            return gson.fromJson(jsonString, typeOfT);
        } catch (JsonSyntaxException e) {
            return null;
        }
    }*/

    public static boolean removeAll(Context context) {
        SharedPreferences.Editor editor = PreferenceManager.getDefaultSharedPreferences(context).edit();
        return editor.clear().commit();
    }

    public static boolean removeKey(Context context, String key) {
        SharedPreferences.Editor editor = PreferenceManager.getDefaultSharedPreferences(context).edit();
        return editor.remove(key).commit();
    }


}
