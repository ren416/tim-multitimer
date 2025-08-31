package com.example.tim

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TimerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "TimerServiceModule"

    @ReactMethod
    fun startTimer(setName: String, timerName: String, durationSec: Int) {
        val intent = Intent(context, TimerService::class.java).apply {
            action = TimerService.ACTION_START
            putExtra(TimerService.EXTRA_SET_NAME, setName)
            putExtra(TimerService.EXTRA_TIMER_NAME, timerName)
            putExtra(TimerService.EXTRA_DURATION, durationSec)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    @ReactMethod
    fun stopTimer() {
        val intent = Intent(context, TimerService::class.java).apply { action = TimerService.ACTION_STOP }
        context.startService(intent)
    }

    @ReactMethod
    fun resetTimer(setName: String, timerName: String, durationSec: Int) {
        val intent = Intent(context, TimerService::class.java).apply {
            action = TimerService.ACTION_RESET
            putExtra(TimerService.EXTRA_SET_NAME, setName)
            putExtra(TimerService.EXTRA_TIMER_NAME, timerName)
            putExtra(TimerService.EXTRA_DURATION, durationSec)
        }
        context.startService(intent)
    }

    @ReactMethod
    fun cancelTimer() {
        val intent = Intent(context, TimerService::class.java).apply { action = TimerService.ACTION_CANCEL }
        context.startService(intent)
    }
}
