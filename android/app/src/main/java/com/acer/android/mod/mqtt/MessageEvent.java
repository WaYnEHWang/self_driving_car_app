package com.acer.android.mod.mqtt;

@SuppressWarnings("unused")
public class MessageEvent {
    public static final String Event_Title_Conn_Lost = "connectionLost";
    public static final String Event_Title_Subscribe = "subscribe";
    public static final String Event_Title_Connect = "connect";
    public static final String Event_Title_Web_Api = "webapi";

    public String title;
    public String topic;
    public String content;
}
