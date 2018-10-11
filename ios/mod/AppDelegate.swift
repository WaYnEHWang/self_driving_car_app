import asl
import Crashlytics
import Fabric
import Firebase
import Foundation
import UIKit
import UserNotifications
import GoogleMaps

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

  var window: UIWindow?
  var bridge: RCTBridge!

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {

    GMSServices.provideAPIKey("AIzaSyBg9d7x2MUo6WVnhy_POk_BdcVscVBktb4");

    let settings = RCTBundleURLProvider.sharedSettings()
    let jsCodeLocation = settings?.jsBundleURL(forBundleRoot: "index", fallbackResource: nil)

    let rootView = RCTRootView(bundleURL: jsCodeLocation, moduleName: "mod", initialProperties: nil, launchOptions: launchOptions)
    let rgba = CGFloat(1.0)
    rootView?.backgroundColor = UIColor(red: rgba, green: rgba, blue: rgba, alpha: rgba)

    self.bridge = rootView?.bridge

    self.window = UIWindow(frame: UIScreen.main.bounds)
    let rootViewController = UIViewController()

    rootViewController.view = rootView
    self.window!.rootViewController = rootViewController
    self.window!.makeKeyAndVisible()

    Fabric.with([Crashlytics.self])
    RCTSetLogThreshold(.trace)
    RCTSetLogFunction(CrashlyticsReactLogFunction)

    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    Messaging.messaging().delegate = self
    if #available(iOS 10.0, *) {
      // For iOS 10 display notification (sent via APNS)
      UNUserNotificationCenter.current().delegate = self

      let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
      UNUserNotificationCenter.current().requestAuthorization(
        options: authOptions,
        completionHandler: { _, _ in })
    } else {
      let settings: UIUserNotificationSettings =
        UIUserNotificationSettings(types: [.alert, .badge, .sound], categories: nil)
      application.registerUserNotificationSettings(settings)
    }
    application.registerForRemoteNotifications()

    RNSplashScreen.show()
    return true
  }

  func application(_ application: UIApplication, open url: URL, sourceApplication: String?, annotation: Any) -> Bool {
    if url.absoluteString.lowercased().range(of: "com.googleusercontent.apps.") != nil {
      return RNGoogleSignin.application(application, open: url, sourceApplication: sourceApplication, annotation: annotation)
    }
    return FBSDKApplicationDelegate.sharedInstance().application(application, open: url, sourceApplication: sourceApplication, annotation: annotation)
  }

  func applicationWillResignActive(_: UIApplication) {
    // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
    // Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
  }

  func applicationDidEnterBackground(_: UIApplication) {
    // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
    // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    //    Log.i("applicationDidEnterBackground")
  }

  // Add the openURL and continueUserActivity functions for Branch
  func application(_ app: UIApplication, open url: URL, options: [UIApplicationOpenURLOptionsKey: Any] = [:]) -> Bool {

    if url.absoluteString.lowercased().range(of: "com.googleusercontent.apps.") != nil {
      if #available(iOS 9.0, *) {
        return RNGoogleSignin.application(app, open: url, sourceApplication: options[UIApplicationOpenURLOptionsKey.sourceApplication] as? String, annotation: [:])
      }
    }
    return FBSDKApplicationDelegate.sharedInstance().application(app, open: url, options: options)
    // return RNBranch.branch.application(app, open: url, options: options)
  }

  // [START registerForRemoteNotifications delegate]
  func application(_: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    Log.d("FCM debug: Unable to register for remote notifications: \(error.localizedDescription)")
  }

  func application(_: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Log.d("FCM debug: APNs token retrieved: \(deviceToken)")
    // handle fcm token in MessagingDelegate didRefreshRegistrationToken
  }

  // [END registerForRemoteNotifications delegate

  // This method is for iOS 9 and below, iOS 10+ use messaging:remoteMessage: (foreground)
  // If remote message has content_available this will be triggered
  func application(_: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                   fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    Log.d("FCM debug: didReceiveRemoteNotification: \(userInfo)")
    if #available(*, iOS 10.0) {
      // TODO: test on real device
      // MessageHandler.handle(messageInfo: userInfo, receiveFrom: MessageHandler.FROM_BACKGROUND)
    }
    completionHandler(UIBackgroundFetchResult.newData)
  }

  let CrashlyticsReactLogFunction: RCTLogFunction = {
    level, _, fileName, lineNumber, message in
    var log = RCTFormatLog(Date(), level, fileName, lineNumber, message)
    CLSNSLogv("%@", getVaList([log!]))

    var aslLevel: Int32
    switch level {
    case .trace:
      aslLevel = ASL_LEVEL_DEBUG
    case .info:
      aslLevel = ASL_LEVEL_NOTICE
    case .warning:
      aslLevel = ASL_LEVEL_WARNING
    case .error:
      aslLevel = ASL_LEVEL_ERR
    case .fatal:
      aslLevel = ASL_LEVEL_CRIT
    }
    asl_vlog(nil, nil, aslLevel, "%s", getVaList([log!]))
  }
}

@available(iOS 10, *)
extension AppDelegate: UNUserNotificationCenterDelegate {

  // Called when a notification is delivered to a foreground app.
  func userNotificationCenter(_: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    let userInfo = notification.request.content.userInfo
    Log.d("FCM debug: willPresent \(userInfo)")
    // MessageHandler.handle(messageInfo: userInfo, receiveFrom: MessageHandler.FROM_FOREGROUND)
    completionHandler([.alert, .badge, .sound])
  }

  // Called when the user responded to the notification by opening the application, dismissing the notification or choosing a UNNotificationAction.
  func userNotificationCenter(_: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo
    Log.d("FCM debug: didReceive \(userInfo)")
    // MessageHandler.handle(messageInfo: userInfo, receiveFrom: MessageHandler.FROM_CLICK)
    completionHandler()
  }
}

extension AppDelegate: MessagingDelegate {

  func messaging(_: Messaging, didRefreshRegistrationToken fcmToken: String) {
    Log.d("FCM debug: didRefreshRegistrationToken: \(fcmToken)")
    FcmManager.saveToken(fcmToken)
    // FcmManager.scheduleForUpload()
  }

  // Receive data messages on iOS 10+ directly from FCM (bypassing APNs) when the app is in the foreground.
  // To enable direct data messages, you can set Messaging.messaging().shouldEstablishDirectChannel to true.
  func messaging(_: Messaging, didReceive remoteMessage: MessagingRemoteMessage) {
    Log.d("FCM debug: Received data message: \(remoteMessage.appData)")
  }
}
