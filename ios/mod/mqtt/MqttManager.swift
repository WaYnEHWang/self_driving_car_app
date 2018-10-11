
@objc(MqttManager)
class MqttManager: NSObject, MQTTSessionDelegate {
  static let Event_Title_Conn_Lost = "connectionLost"
  static let Event_Title_Subscribe = "subscribe"
  static let Event_Title_Connect = "connect"
  static let Event_Title_Web_Api = "webapi"
  static let LOCAL_MQTT_URL_V2 = "labmqtt.sdc-acer.com"
  static let LOCAL_MQTT_URL_V1 = "10.36.162.242"
  static let AWS_MQTT_URL_V1 = "mqtt.sdc-acer.com"
  static let AWS_MQTT_URL_V2 = "mqttv2.sdc-acer.com"
  static let MQTT_HOST = AWS_MQTT_URL_V1 // LOCAL_MQTT_URL
  static let MQTT_USER_NAME_V2 = "superadmin"
  static let MQTT_PASSWORD_V2 = "JUYyPyyEKS"
  static let MQTT_USER_NAME_V1 = "admin"
  static let MQTT_PASSWORD_V1 = "1qaz2wsx"
  static let MQTT_USER_NAME = (MQTT_HOST == LOCAL_MQTT_URL_V2 || MQTT_HOST == AWS_MQTT_URL_V2 ) ? MQTT_USER_NAME_V2 : MQTT_USER_NAME_V1
  static let MQTT_PASSWORD = (MQTT_HOST == LOCAL_MQTT_URL_V2 || MQTT_HOST == AWS_MQTT_URL_V2 ) ? MQTT_PASSWORD_V2 : MQTT_PASSWORD_V1

  var sessionConnected = false
  var sessionError = false
  var sessionReceived = false
  var sessionSubAcked = false
  var isV2_pro = true
  var session: MQTTSession?

  private override init() {
    super.init()
    UserDefaults.standard.register(defaults: ["is_v2_pro" : true])
    isV2_pro = UserDefaults.standard.bool(forKey: "is_v2_pro")
    Log.d("Mqtt init isPro: \(isV2_pro)")
    connect()
  }

  func connect() {
    guard let newSession = MQTTSession() else {
      fatalError("Could not create MQTTSession")
    }
    session = newSession

    newSession.delegate = self

    newSession.userName = MqttManager.MQTT_USER_NAME_V2
    newSession.password = MqttManager.MQTT_PASSWORD_V2
    if isV2_pro {
      Log.d("connect v2 Production")
      newSession.connect(toHost: MqttManager.AWS_MQTT_URL_V2, port: 1883, usingSSL: false)
    } else {
      Log.d("connect v2 Debug")
      newSession.connect(toHost: MqttManager.LOCAL_MQTT_URL_V2, port: 1883, usingSSL: false)
    }
  }

  @objc(subscribe:qos:)
  func subscribe(topicName: String, qos: Int) {
    let enumQos: MQTTQosLevel
    switch qos {
    case 0:
      enumQos = .atMostOnce
    case 1:
      enumQos = .atLeastOnce
    case 2:
      enumQos = .exactlyOnce
    default:
      enumQos = .atMostOnce
    }
    Log.d("subscribe to \(topicName) \(qos)")
    session?.subscribe(toTopic: topicName, at: enumQos)
  }

  func handleEvent(_: MQTTSession!, event eventCode: MQTTSessionEvent, error _: Error!) {
    switch eventCode {
    case .connected:
      sessionConnected = true
      break
    case .connectionClosed:
      sessionConnected = false
      break
    default:
      sessionError = true
      break
    }
    Log.d("handleEvent session Connected: \(sessionConnected)")
  }

  func newMessage(_: MQTTSession!, data: Data!, onTopic topic: String!, qos: MQTTQosLevel, retained: Bool, mid: UInt32) {
    let content = String(data: data!, encoding: String.Encoding.ascii) as String!
    print("newMessage: Received `\(content!)` on:\(topic!) q:\(qos) r:\(retained) m:\(mid)")
    let map: [String: String] = [
      "title": MqttManager.Event_Title_Subscribe,
      "topic": topic!,
      "content": content!,
    ]
    RN.sendEvent(.mqttMessageEvent, body: map)

    sessionReceived = true
  }

  func subAckReceived(_: MQTTSession!, msgID _: UInt16, grantedQoss _: [NSNumber]!) {
    sessionSubAcked = true
  }

  @objc
  func set2v2_pro(_ v2: Bool) {
    isV2_pro = v2
    UserDefaults.standard.set(isV2_pro, forKey: "is_v2_pro")
    UserDefaults.standard.synchronize()
    Log.d("set2v2_pro isPro: \(isV2_pro)")
    reConnectMqttServer()
  }

  func reConnectMqttServer() {
    Log.d("reConnectMqttServer isPro: \(isV2_pro)")
    session?.disconnect()
    session?.close()
    connect();
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
