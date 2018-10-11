import Firebase
import Foundation

@objc(FcmManager)
class FcmManager: NSObject {
  static let EVENT_ON_PUSHNOTIFICATION_RECEIVED = RN.Event.pushNotificationNotify.rawValue
  static let KEY_TOKEN = "fcm_token"

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc func constantsToExport() -> [AnyHashable: Any]! {
    var constants = [String: Any]()
    constants["EVENT_ON_PUSHNOTIFICATION_RECEIVED"] = FcmManager.EVENT_ON_PUSHNOTIFICATION_RECEIVED
    return constants
  }

  static func saveToken(_ token: String) {
    let userDefault = UserDefaults.standard
    userDefault.set(token, forKey: KEY_TOKEN)
    userDefault.synchronize()
  }

  static func deleteToken() {
    /*
     // Sender ID cannot no longer send notifications to the FCM token
    if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"), let dict = NSDictionary(contentsOfFile: path) as? [String: AnyObject] {
      let senderId = dict["GCM_SENDER_ID"] as! String
      Messaging.messaging().deleteFCMToken(forSenderID: senderId) { error in
        Log.d("Delete token error: \(String(describing: error))")
      }
    }*/
    // Revokes the token
    InstanceID.instanceID().deleteID { error in
      Log.d("Delete token error: \(String(describing: error))")
    }
    let userDefault = UserDefaults.standard
    userDefault.removeObject(forKey: KEY_TOKEN)
    userDefault.synchronize()
  }

  static func ensureGetToken() -> String? {
    let userDefault = UserDefaults.standard
    guard let token = userDefault.string(forKey: KEY_TOKEN), token != "" else {
      let newToken = Messaging.messaging().fcmToken
      Log.d("fcmToken Not fetch token after login, refetch from Messaging: \(String(describing: newToken))")
      if newToken != nil {
        saveToken(newToken!)
      }
      return newToken
    }
    Log.i("fcmToken ensureGetToken token = \(token)")
    return token
  }

  // This method should called after login
  @objc(scheduleToSendToken)
  func scheduleToSendToken() {
    // FcmManager.scheduleForUpload()
  }

  // This method should called when logout
  @objc(clear)
  func clear() {
    // TODO: stop upload token job
    FcmManager.deleteToken()
  }

  // This method should called get token
  @objc
  func getFCMToken(_ resolve: RCTPromiseResolveBlock, reject _: RCTPromiseRejectBlock) {
    // TODO: stop upload token job
    let token = FcmManager.ensureGetToken()
    Log.i("fcmToken token = \(String(describing: token))")
    resolve(token)
  }

  @objc(refreshFCMToken)
  func refreshFCMToken() {
    // TODO: stop upload token job
    FcmManager.ensureGetToken()
  }
}

class MessageHandler: NSObject {

  static let MSG_TYPE_DIALOG = "dialog"
  static let MSG_TYPE_LINK = "link"

  static let FROM_FOREGROUND = "fcm:foreground"
  static let FROM_BACKGROUND = "fcm:bacdground"
  static let FROM_CLICK = "fcm:user_click"

  static let HANDLE_NONE = "fcm:handle_none"
  static let HANDLE_JS_EVENT = "fcm:handle_js_event"
  static let HANDLE_NOTIFICATION = "fcm:handle_local_notification"

  static func handle(messageInfo: [AnyHashable: Any], receiveFrom: String) {
    let fcmClient = FcmMessage.get(message: messageInfo, receiveFrom: receiveFrom)
    Log.i("FCM debug: Start to handle a message \(fcmClient.getDescription())")

    switch fcmClient.getHandleType() {
    case HANDLE_JS_EVENT:
      RN.sendEvent(.pushNotificationNotify, body: fcmClient.getEventBody())
      break
    case HANDLE_NOTIFICATION:
      // Beware local notification can only be presented in background, use alert view or send js event in foreground
      if let notification = fcmClient.getNotificationBody() {
        UIApplication.shared.scheduleLocalNotification(notification)
      }
      break
    default:
      Log.i("FCM debug: Unhandle message")
      break
    }
  }
}

public protocol FcmMessageClient {
  func getHandleType() -> String
  func getEventBody() -> [String: Any]
  func getNotificationBody() -> UILocalNotification?
  func getDescription() -> String
}

class FcmMessage {
  static let TYPE_ANNOUNCEMENT_WITH_DIALOG = "10"
  static let TYPE_ANNOUNCEMENT_WITH_LINK = "11"
  static let TYPE_QUESTIONNAIRE = "20"
  static let TYPE_APP_UPDATE = "30"

  let messageType: String!
  let message: [AnyHashable: Any]!
  let receiveFrom: String!

  static func get(message: [AnyHashable: Any], receiveFrom: String) -> FcmMessageClient {
    if let type = message["type"] as? String {
      switch type {
      case TYPE_ANNOUNCEMENT_WITH_DIALOG:
        return DialogMessage(message: message, receiveFrom: receiveFrom)
      case TYPE_ANNOUNCEMENT_WITH_LINK, TYPE_QUESTIONNAIRE:
        return LinkMessage(message: message, receiveFrom: receiveFrom, parseKey: "url")
      case TYPE_APP_UPDATE:
        return LinkMessage(message: message, receiveFrom: receiveFrom, parseKey: "market_ios")
      default:
        Log.w("no matching fcm support message type")
      }
    }

    return EmptyMessage()
  }

  init(message: [AnyHashable: Any], receiveFrom: String) {
    messageType = message["type"] as! String!
    self.message = message
    self.receiveFrom = receiveFrom
  }

  func getBasicNotification(_ title: String, withBody body: String) -> UILocalNotification {
    // TODO: UILocalNotification is deprecated in iOS 10
    let notification = UILocalNotification()
    notification.fireDate = Date()
    if #available(iOS 8.2, *) {
      notification.alertTitle = title
    }
    notification.alertBody = body
    notification.soundName = UILocalNotificationDefaultSoundName
    return notification
  }
}

class DialogMessage: FcmMessage, FcmMessageClient {
  private static let TYPE = MessageHandler.MSG_TYPE_DIALOG
  private var title: String!
  private var body: String!

  override init(message: [AnyHashable: Any], receiveFrom: String) {
    super.init(message: message, receiveFrom: receiveFrom)
    title = message["title"] as? String ?? ""
    body = message["body"] as? String ?? ""
  }

  func getHandleType() -> String {
    guard title != "", body != "" else {
      return MessageHandler.HANDLE_NONE
    }
    return MessageHandler.HANDLE_JS_EVENT
  }

  func getEventBody() -> [String: Any] {
    return [
      "type": DialogMessage.TYPE,
      "title": title,
      "body": body,
    ]
  }

  func getNotificationBody() -> UILocalNotification? {
    return super.getBasicNotification(title, withBody: body)
  }

  func getDescription() -> String {
    return "messageType: \(messageType) receiveFrom: \(receiveFrom), handle type: \(getHandleType()), content: [title=\(title), body=\(body)]"
  }
}

class LinkMessage: FcmMessage, FcmMessageClient {
  private static let TYPE = MessageHandler.MSG_TYPE_LINK
  private var parseKey: String!
  private var link: String!

  init(message: [AnyHashable: Any], receiveFrom: String, parseKey: String) {
    super.init(message: message, receiveFrom: receiveFrom)
    self.parseKey = parseKey
    self.link = message[parseKey] as? String ?? ""
  }

  func getHandleType() -> String {
    guard link != "" else {
      return MessageHandler.HANDLE_NONE
    }
    // TODO: how to handle in foreground
    return MessageHandler.HANDLE_JS_EVENT
  }

  func getEventBody() -> [String: Any] {
    return [
      "type": LinkMessage.TYPE,
      "link": link,
    ]
  }

  func getNotificationBody() -> UILocalNotification? {
    guard let title = message["title"] as? String, let body = message["body"] as? String else {
      return nil
    }
    let notification = super.getBasicNotification(title, withBody: body)
    notification.userInfo = [
      "type": messageType,
      parseKey: link,
    ]
    return notification
  }

  func getDescription() -> String {
    return "messageType: \(messageType) receiveFrom: \(receiveFrom), handle type: \(getHandleType()), content: [link=\(link)]"
  }
}

class EmptyMessage: FcmMessageClient {

  func getHandleType() -> String {
    return MessageHandler.HANDLE_NONE
  }

  func getEventBody() -> [String: Any] {
    return [:]
  }

  func getNotificationBody() -> UILocalNotification? {
    return nil
  }

  func getDescription() -> String {
    return "EmptyMessage"
  }
}

class RN /* RCTEventEmitter */ {
  enum Event: String {
    case pushNotificationNotify = "onPushNotificationReceived"

    case mqttMessageEvent = "onMqttMessageEvent"
  }

  // unknown error
  static let UNKNOWN_ERROR = -99

  static func sendEvent(_ event: RN.Event, body: Any) {
    if Utility.isRunningInBackground() {
      Log.d("running background, shoud not send event")
      return
    }

    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }
    appDelegate.bridge.eventDispatcher().sendAppEvent(withName: event.rawValue, body: body)
  }
}
