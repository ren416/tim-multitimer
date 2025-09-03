import ActivityKit
import WidgetKit
import SwiftUI

@available(iOSApplicationExtension 16.1, *)
struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerLiveActivityAttributes.self) { context in
            VStack {
                Text(context.attributes.setName)
                Text(context.attributes.timerName)
                Text(context.state.endTime, style: .timer)
            }
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.timerName)
                    Text(context.state.endTime, style: .timer)
                }
            } compactLeading: {
                Text(context.state.endTime, style: .timer)
            } compactTrailing: {
                Text("")
            } minimal: {
                Text(context.state.endTime, style: .timer)
            }
        }
    }
}
