import ActivityKit

struct TimerLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var endTime: Date
    }
    var setName: String
    var timerName: String
}
