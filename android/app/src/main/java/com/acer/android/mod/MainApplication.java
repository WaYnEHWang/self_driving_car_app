package com.acer.android.mod;

import android.app.Application;

import com.acer.android.mod.fcm.FcmPackage;
import com.acer.android.mod.mqtt.MqttPackage;
import com.acer.android.mod.rn.RN;

import com.crashlytics.android.Crashlytics;
import com.crashlytics.android.core.CrashlyticsCore;
import com.facebook.appevents.AppEventsLogger;
import com.facebook.CallbackManager;
import com.facebook.FacebookSdk;
import com.facebook.common.logging.FLog;
import com.facebook.reactnative.androidsdk.FBSDKPackage;
import com.facebook.react.ReactApplication;
import org.reactnative.camera.RNCameraPackage;
import com.soundapp.SoundModulePackage;
import com.smixx.fabric.FabricPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import com.airbnb.android.react.maps.MapsPackage;
import com.babisoft.ReactNativeLocalization.ReactNativeLocalizationPackage;

import java.util.Arrays;
import java.util.List;

import co.apptailor.googlesignin.RNGoogleSigninPackage;
import io.fabric.sdk.android.Fabric;

import org.devio.rn.splashscreen.SplashScreenReactPackage;
import com.devfd.RNGeocoder.RNGeocoderPackage;

public class MainApplication extends Application implements ReactApplication {
    private static CallbackManager mCallbackManager = CallbackManager.Factory.create();

    protected static CallbackManager getCallbackManager() {
        return mCallbackManager;
    }

    private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            return Arrays.<ReactPackage>asList(
                    new MapsPackage(),
                    new ReactNativeLocalizationPackage(),
                    new FBSDKPackage(mCallbackManager),
                    new RNGoogleSigninPackage(),
                    new FcmPackage(),
                    new MqttPackage(),
                    new FabricPackage(),
                    new MainReactPackage(),
                    new RNCameraPackage(),
                    new SoundModulePackage(),
                    new SplashScreenReactPackage(),
                    new RNGeocoderPackage()
            );
        }

        @Override
        protected String getJSMainModuleName() {
            return "index";
        }
    };

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoader.init(this, /* native exopackage */ false);
        FacebookSdk.sdkInitialize(getApplicationContext());
        // If you want to use AppEventsLogger to log events.
        AppEventsLogger.activateApp(this);

        // Set up Crashlytics, disabled for debug builds
        Crashlytics crashlyticsKit = new Crashlytics.Builder()
                .core(new CrashlyticsCore.Builder().disabled(BuildConfig.DEBUG).build())
                .build();
        Fabric.with(this, crashlyticsKit);
        FLog.setLoggingDelegate(ReactNativeFabricLogger.getInstance());

        RN.init(this);
    }
}
