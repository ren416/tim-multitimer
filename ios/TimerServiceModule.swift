import Foundation
import ActivityKit
import UserNotifications
import React

@objc(TimerServiceModule)
class TimerServiceModule: NSObject {
  private var activity: Any?

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc func startTimer(_ setName: String, timerName: String, durationSec: NSNumber) {
    if #available(iOS 16.1, *) {
      let attributes = TimerLiveActivityAttributes(setName: setName, timerName: timerName)
      let state = TimerLiveActivityAttributes.ContentState(endTime: Date().addingTimeInterval(durationSec.doubleValue))
      do {
        activity = try Activity<TimerLiveActivityAttributes>.request(attributes: attributes, contentState: state)
      } catch {
        print("Failed to start activity: \(error)")
      }
    }
    scheduleEndNotification(setName: setName, timerName: timerName, duration: durationSec.doubleValue)
  }

  @objc func stopTimer() {
    if #available(iOS 16.1, *), let act = activity as? Activity<TimerLiveActivityAttributes> {
      act.end(nil, dismissalPolicy: .immediate)
      activity = nil
    }
  }

  @objc func resetTimer(_ setName: String, timerName: String, durationSec: NSNumber) {
    stopTimer()
    startTimer(setName, timerName: timerName, durationSec: durationSec)
  }

  @objc func cancelTimer() {
    stopTimer()
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["timer_end"])
  }

  private func scheduleEndNotification(setName: String, timerName: String, duration: Double) {
    let content = UNMutableNotificationContent()
    content.title = setName
    content.body = "\(timerName) 完了"
    content.sound = .default

    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: duration, repeats: false)
    let request = UNNotificationRequest(identifier: "timer_end", content: content, trigger: trigger)
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }
}

extension TimerServiceModule: RCTBridgeModule {
  static func moduleName() -> String! {
    return "TimerServiceModule"
  }
}
