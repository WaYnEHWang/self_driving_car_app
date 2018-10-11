import Foundation

private let formatter = DateFormatter()
public let DEBUG_MODE = true

class Log {

  fileprivate enum LogType {
    case debug, info, wran, err
  }

  fileprivate class func getThreadInfo() -> String {
    let isMain = Thread.current.isMainThread
    let tStr = Thread.current.description
    let filter1 = "number = "
    let filter2 = ","
    let r = tStr.range(of: filter1)
    let indexStart = tStr[filter1] + filter1.count
    let indexEnd = tStr[filter2] - indexStart
    let id = tStr.trim(indexStart, indexEnd)

    return isMain ? "main (\(id))" : "thread (\(id))"
  }

  class func d(_ description: String, lineNumber: Int = #line, file: String = #file) {
    guard DEBUG_MODE else {
      return
    }
    let tInfo = getThreadInfo()
    NSLog("[\(LogType.debug)|\(tInfo)] >> [\((file as NSString).lastPathComponent) : \(lineNumber)] \(description)")
  }

  class func i(_ description: String, lineNumber: Int = #line, file: String = #file) {
    let tInfo = getThreadInfo()
    NSLog("[\(LogType.info)|\(tInfo)] >> [\((file as NSString).lastPathComponent) : \(lineNumber)] \(description)")
  }

  class func w(_ description: String, lineNumber: Int = #line, file: String = #file) {
    let tInfo = getThreadInfo()
    NSLog("[\(LogType.wran)|\(tInfo)] >> [\((file as NSString).lastPathComponent) : \(lineNumber)] \(description)")
  }

  class func e(_ description: String, lineNumber: Int = #line, file: String = #file) {
    let tInfo = getThreadInfo()
    NSLog("[\(LogType.err)|\(tInfo)] ## [\((file as NSString).lastPathComponent) : \(lineNumber)] \(description)")
  }
}
