package com.example.tim

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle

class TimerService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var running = false
    private var endTime: Long = 0
    private var remainingSec: Int = 0
    private var initialDuration: Int = 0
    private var setName: String = ""
    private var timerName: String = ""

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                setName = intent.getStringExtra(EXTRA_SET_NAME) ?: setName
                timerName = intent.getStringExtra(EXTRA_TIMER_NAME) ?: timerName
                val duration = intent.getIntExtra(EXTRA_DURATION, remainingSec)
                if (!running) {
                    initialDuration = duration
                    remainingSec = duration
                }
                startTimer()
            }
            ACTION_STOP -> stopTimer()
            ACTION_RESET -> {
                setName = intent.getStringExtra(EXTRA_SET_NAME) ?: setName
                timerName = intent.getStringExtra(EXTRA_TIMER_NAME) ?: timerName
                val duration = intent.getIntExtra(EXTRA_DURATION, initialDuration)
                resetTimer(duration)
            }
            ACTION_CANCEL -> {
                stopForeground(true)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun startTimer() {
        endTime = System.currentTimeMillis() + remainingSec * 1000L
        running = true
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
        handler.removeCallbacks(finishRunnable)
        handler.postAtTime(finishRunnable, endTime)
    }

    private fun stopTimer() {
        if (running) {
            remainingSec = ((endTime - System.currentTimeMillis()) / 1000).toInt().coerceAtLeast(0)
        }
        running = false
        handler.removeCallbacks(finishRunnable)
        updateNotification()
    }

    private fun resetTimer(duration: Int) {
        initialDuration = duration
        remainingSec = duration
        running = false
        handler.removeCallbacks(finishRunnable)
        updateNotification()
    }

    private val finishRunnable = Runnable {
        running = false
        updateNotification()
        showFinishNotification()
        stopForeground(true)
        stopSelf()
    }

    private fun updateNotification() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(setName)
            .setOnlyAlertOnce(true)
            .setOngoing(running)
            .setStyle(MediaStyle())

        if (running) {
            builder.setContentText(timerName)
                .setUsesChronometer(true)
                .setWhen(endTime)
                .setChronometerCountDown(true)
        } else {
            builder.setContentText("$timerName ${formatTime(remainingSec)}")
        }

        val startIntent = Intent(this, TimerService::class.java).apply { action = ACTION_START }
        val startPi = PendingIntent.getService(this, 0, startIntent, PendingIntent.FLAG_UPDATE_CURRENT or flagImmutable())
        val stopIntent = Intent(this, TimerService::class.java).apply { action = ACTION_STOP }
        val stopPi = PendingIntent.getService(this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or flagImmutable())
        val resetIntent = Intent(this, TimerService::class.java).apply {
            action = ACTION_RESET
            putExtra(EXTRA_SET_NAME, setName)
            putExtra(EXTRA_TIMER_NAME, timerName)
            putExtra(EXTRA_DURATION, initialDuration)
        }
        val resetPi = PendingIntent.getService(this, 2, resetIntent, PendingIntent.FLAG_UPDATE_CURRENT or flagImmutable())

        builder.clearActions()
        builder.addAction(0, "開始", startPi)
        builder.addAction(0, "停止", stopPi)
        builder.addAction(0, "リセット", resetPi)
        return builder.build()
    }

    private fun showFinishNotification() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val builder = NotificationCompat.Builder(this, FINISH_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(setName)
            .setContentText("$timerName 完了")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
        nm.notify(FINISH_NOTIFICATION_ID, builder.build())
    }

    private fun formatTime(sec: Int): String {
        val m = sec / 60
        val s = sec % 60
        return String.format("%02d:%02d", m, s)
    }

    private fun flagImmutable(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            val runChannel = NotificationChannel(CHANNEL_ID, "Timer", NotificationManager.IMPORTANCE_LOW)
            nm.createNotificationChannel(runChannel)
            val finishChannel = NotificationChannel(FINISH_CHANNEL_ID, "Timer Finished", NotificationManager.IMPORTANCE_HIGH)
            nm.createNotificationChannel(finishChannel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val CHANNEL_ID = "timer_channel"
        const val FINISH_CHANNEL_ID = "timer_finish_channel"
        const val NOTIFICATION_ID = 1
        const val FINISH_NOTIFICATION_ID = 2
        const val ACTION_START = "com.example.tim.action.START"
        const val ACTION_STOP = "com.example.tim.action.STOP"
        const val ACTION_RESET = "com.example.tim.action.RESET"
        const val ACTION_CANCEL = "com.example.tim.action.CANCEL"
        const val EXTRA_SET_NAME = "extra_set_name"
        const val EXTRA_TIMER_NAME = "extra_timer_name"
        const val EXTRA_DURATION = "extra_duration"
    }
}

