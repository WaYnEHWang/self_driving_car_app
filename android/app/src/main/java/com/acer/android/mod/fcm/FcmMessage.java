package com.acer.android.mod.fcm;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.support.v4.app.NotificationCompat;
import android.text.TextUtils;

import com.acer.android.mod.MainActivity;
import com.acer.android.mod.R;
import com.acer.android.mod.debug.L;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import java.util.Map;

public abstract class FcmMessage {
    protected final String TAG = getClass().getSimpleName();

    /*
     * Message Type
     * All these messages contain "notification" and "data" property, onMessageReceived trigger only in Foreground.
     * Handle extras of the intent when user press system notification in Background
     */
    static final String TYPE_ANNOUNCEMENT_WITH_DIALOG = "10";
    static final String TYPE_ANNOUNCEMENT_WITH_LINK = "11";
    static final String TYPE_QUESTIONNAIRE = "20";
    static final String TYPE_APP_UPDATE = "30";

    protected String messageType;
    protected Map<String, String> message;
    protected String receiveFrom;

    public static FcmClient get(Map<String, String> message, String receiveFrom) {
        String type = message.get("type");
        if (!TextUtils.isEmpty(type)) {
            switch (type) {
                case TYPE_ANNOUNCEMENT_WITH_DIALOG:
                    return new DialogMessage(message, receiveFrom);
                case TYPE_ANNOUNCEMENT_WITH_LINK:
                case TYPE_QUESTIONNAIRE:
                    return new LinkMessage(message, receiveFrom, "url");
                case TYPE_APP_UPDATE:
                    return new LinkMessage(message, receiveFrom, "market_android");
                default:
                    L.w("no matching fcm support type");
            }
        }
        return new EmptyMessage();
    }

    FcmMessage(Map<String, String> message, String receiveFrom) {
        this.messageType = message.get("type");
        this.message = message;
        this.receiveFrom = receiveFrom;
    }

    NotificationCompat.Builder getBasicNotificationBuilder(Context context, String title, String body) {
        return new NotificationCompat.Builder(context)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setDefaults(Notification.DEFAULT_ALL)
                .setPriority(Notification.PRIORITY_HIGH)
                .setVibrate(new long[0])
                .setAutoCancel(true)
                .setContentTitle(title)
                .setContentText(body);
    }

    static class DialogMessage extends FcmMessage implements FcmClient {
        private static final String TYPE = MessageHandler.MSG_TYPE_DIALOG;
        private String title;
        private String body;

        DialogMessage(Map<String, String> message, String receiveFrom) {
            super(message, receiveFrom);
            title = message.get("title");
            body = message.get("body");
        }

        @Override
        public String getHandleType() {
            boolean isValid = !TextUtils.isEmpty(title) && !TextUtils.isEmpty(body);
            if (isValid) {
                return MessageHandler.FROM_INTENT.equals(receiveFrom) ? MessageHandler.HANDLE_JS_EVENT : MessageHandler.HANDLE_NOTIFICATION;
            } else {
                return MessageHandler.HANDLE_NONE;
            }
        }

        @Override
        public WritableMap getEventBody() {
            WritableMap map = Arguments.createMap();
            map.putString("type", TYPE);
            map.putString("title", title);
            map.putString("body", body);
            return map;
        }

        @Override
        public Notification getNotificationBody(Context context) {
            NotificationCompat.Builder builder = getBasicNotificationBuilder(context, title, body);
            return builder.build();
        }

        @Override
        public String getDescription() {
            return "messageType: " + messageType + " receiveFrom: " + receiveFrom + ", handle type: " + getHandleType() +
                    ", content: [title=" + title + ", body=" + body + "]";
        }
    }

    static class LinkMessage extends FcmMessage implements FcmClient {
        private static final String TYPE = MessageHandler.MSG_TYPE_LINK;
        private String parseKey;
        private String link;

        LinkMessage(Map<String, String> message, String receiveFrom, String parseKey) {
            super(message, receiveFrom);
            this.parseKey = parseKey;
            link = message.get(parseKey);
        }

        @Override
        public WritableMap getEventBody() {
            WritableMap map = Arguments.createMap();
            map.putString("type", TYPE);
            map.putString("link", link);
            return map;
        }

        @Override
        public Notification getNotificationBody(Context context) {
            String title = message.get("title");
            String body = message.get("body");
            if (!TextUtils.isEmpty(title) && !TextUtils.isEmpty(body)) {
                Intent i = new Intent(context, MainActivity.class);
                i.putExtra("type", messageType);
                i.putExtra(parseKey, link);
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, i, PendingIntent.FLAG_ONE_SHOT);

                NotificationCompat.Builder builder = getBasicNotificationBuilder(context, title, body)
                        .setContentIntent(pendingIntent);
                return builder.build();
            }
            return null;
        }

        @Override
        public String getHandleType() {
            boolean isValid = !TextUtils.isEmpty(link);
            if (isValid) {
                return MessageHandler.FROM_INTENT.equals(receiveFrom) ? MessageHandler.HANDLE_JS_EVENT : MessageHandler.HANDLE_NOTIFICATION;
            } else {
                return MessageHandler.HANDLE_NONE;
            }
        }

        @Override
        public String getDescription() {
            return "messageType: " + messageType + " receiveFrom: " + receiveFrom + ", handle type: " + getHandleType() + ", content: [link=" + link + "]";
        }
    }

    static class EmptyMessage implements FcmClient {
        @Override
        public String getHandleType() {
            return MessageHandler.HANDLE_NONE;
        }

        @Override
        public WritableMap getEventBody() {
            return null;
        }

        @Override
        public Notification getNotificationBody(Context context) {
            return null;
        }

        @Override
        public String getDescription() {
            return "EmptyMessage";
        }
    }

    interface FcmClient {
        String getHandleType();
        WritableMap getEventBody();
        Notification getNotificationBody(Context context);
        String getDescription();
    }
}
