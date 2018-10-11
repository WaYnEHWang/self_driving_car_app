package com.acer.android.mod.mqtt;

import android.util.Log;

import com.acer.android.mod.Util;

import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.greenrobot.eventbus.EventBus;

public class MqttCallbackBus implements MqttCallback {
    private final static String TAG = Util.TAG;

    @Override
    public void connectionLost(Throwable cause) {
        Log.e(TAG, "connectionLost:" + cause.getMessage());
        MessageEvent msg = new MessageEvent();
        msg.title = MessageEvent.Event_Title_Conn_Lost;
        msg.content = cause.getMessage();
        EventBus.getDefault().post(msg);
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        Log.d(TAG, "messageArrived:" + topic + ", " + message.toString());
        MessageEvent msg = new MessageEvent();
        msg.title = MessageEvent.Event_Title_Subscribe;
        msg.topic = topic;
        msg.content = message.toString();
        EventBus.getDefault().post(msg);
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
        try {
            Log.e(TAG, "deliveryComplete:" + token.getMessage());
        } catch (MqttException e) {
            e.printStackTrace();
        }

    }
}
