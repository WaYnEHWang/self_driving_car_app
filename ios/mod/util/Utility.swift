import Foundation

public struct Utility {
  private init() {
  }

  static func isRunningInBackground() -> Bool {
    return UIApplication.shared.applicationState == .background
  }

  static func isRunningInForeground() -> Bool {
    return UIApplication.shared.applicationState == .active
  }
}
