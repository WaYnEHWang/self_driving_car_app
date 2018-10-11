import CoreBluetooth
import Foundation

public func += <K, V>(left: inout [K: V], right: [K: V]) {
  for (k, v) in right {
    left.updateValue(v, forKey: k)
  }
}

//pow
public func ^ (radix: Int, power: Int) -> Int {
  return Int(pow(Double(radix), Double(power)))
}

extension String {

  //put string return index --> ex: "Hello".[e]  --> 1
  subscript(str: String) -> Int {
    let range: Range<String.Index> = self.range(of: str)!
    return characters.distance(from: startIndex, to: range.lowerBound)
  }

  /// var s="1234567890"
  /// var s4 = s[2...4]
  ///print(s4);//345
  subscript(_ s: Int, _ e: Int) -> String {
    let start = index(self.startIndex, offsetBy: s)
    let end = index(self.endIndex, offsetBy: e)
    let range = start ..< end

    return self[range]
  }

  ///index to index --> ex: "Hello" (0,2) --> he
  func trim(_ from: Int, _ to: Int) -> String {
    let range = NSMakeRange(from, to)
    return (self as NSString).substring(with: range)
  }

  func hexadecimalStringToInt() -> Int {
    return Int(strtoul(self, nil, 16))
  }

  func md5ToBytes() -> [UInt8] {
    var digest = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
    if let data = data(using: String.Encoding.utf8) {
      CC_MD5((data as NSData).bytes, CC_LONG(data.count), &digest)
    }
    return digest
  }

  func md5String(_ md5Bytes: [UInt8]) -> String {

    var digestHex = ""
    for index in 0 ..< Int(CC_MD5_DIGEST_LENGTH) {
      digestHex += String(format: "%02x", md5Bytes[index])
    }
    Log.i("digestHex: \(digestHex)")
    return digestHex
  }
}

extension Data {
  func toBytes() -> [UInt8] {
    var bytes = [UInt8](repeating: 0, count: self.count)
    (self as NSData).getBytes(&bytes, length: self.count)
    return bytes
  }
}

extension CBCharacteristic {
  func isWritable() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.write)) != []
  }

  func isReadable() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.read)) != []
  }

  func isWritableWithoutResponse() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.writeWithoutResponse)) != []
  }

  func isNotifable() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.notify)) != []
  }

  func isIdicatable() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.indicate)) != []
  }

  func isBroadcastable() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.broadcast)) != []
  }

  func isExtendedProperties() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.extendedProperties)) != []
  }

  func isAuthenticatedSignedWrites() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.authenticatedSignedWrites)) != []
  }

  func isNotifyEncryptionRequired() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.notifyEncryptionRequired)) != []
  }

  func isIndicateEncryptionRequired() -> Bool {
    return (self.properties.intersection(CBCharacteristicProperties.indicateEncryptionRequired)) != []
  }

  func getPropertyContent() -> String {
    var propContent = ""
    if (self.properties.intersection(CBCharacteristicProperties.broadcast)) != [] {
      propContent += "Broadcast,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.read)) != [] {
      propContent += "Read,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.writeWithoutResponse)) != [] {
      propContent += "WriteWithoutResponse,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.write)) != [] {
      propContent += "Write,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.notify)) != [] {
      propContent += "Notify,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.indicate)) != [] {
      propContent += "Indicate,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.authenticatedSignedWrites)) != [] {
      propContent += "AuthenticatedSignedWrites,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.extendedProperties)) != [] {
      propContent += "ExtendedProperties,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.notifyEncryptionRequired)) != [] {
      propContent += "NotifyEncryptionRequired,"
    }
    if (self.properties.intersection(CBCharacteristicProperties.indicateEncryptionRequired)) != [] {
      propContent += "IndicateEncryptionRequired,"
    }
    return propContent
  }
}

//UI
extension UIAlertController {
  func show() {
    present(animated: true, completion: nil)
  }

  func present(animated: Bool, completion: (() -> Void)?) {
    if let rootVC = UIApplication.shared.keyWindow?.rootViewController {
      presentFromController(controller: rootVC, animated: animated, completion: completion)
    }
  }

  private func presentFromController(controller: UIViewController, animated: Bool, completion: (() -> Void)?) {
    if let navVC = controller as? UINavigationController,
      let visibleVC = navVC.visibleViewController {
      presentFromController(controller: visibleVC, animated: animated, completion: completion)
    } else
    if let tabVC = controller as? UITabBarController,
      let selectedVC = tabVC.selectedViewController {
      presentFromController(controller: selectedVC, animated: animated, completion: completion)
    } else {
      controller.present(self, animated: animated, completion: completion)
    }
  }

  func dismiss(completion: (() -> Void)? = nil) {
    self.dismiss(animated: true, completion: completion)
  }
}

extension Int {
  init?(_ dubleString: String) {
    guard let d = Double(dubleString) else {
      return nil
    }
    self = Int(d)
  }
}
