package com.swimex.edge.webview

import android.bluetooth.BluetoothManager
import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.webkit.JavascriptInterface
import com.swimex.edge.kiosk.KioskActivity
import org.json.JSONObject
import java.net.NetworkInterface

class EdgeJavaScriptInterface(private val activity: KioskActivity) {

    private val prefs by lazy {
        activity.getSharedPreferences(KioskActivity.PREFS_NAME, Context.MODE_PRIVATE)
    }

    @JavascriptInterface
    fun exitKiosk(username: String, password: String) {
        activity.runOnUiThread {
            activity.exitKiosk(username, password)
        }
    }

    @JavascriptInterface
    fun getServerUrl(): String {
        return activity.getServerUrlForJs()
    }

    @JavascriptInterface
    fun setServerUrl(url: String) {
        prefs.edit().putString(KioskActivity.KEY_SERVER_URL, url).apply()
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val json = JSONObject().apply {
            put("model", Build.MODEL)
            put("manufacturer", Build.MANUFACTURER)
            put("osVersion", Build.VERSION.RELEASE)
            put("sdkLevel", Build.VERSION.SDK_INT)
            put("macAddress", getMacAddress())
        }
        return json.toString()
    }

    @JavascriptInterface
    fun isKioskMode(): Boolean {
        return try {
            val am = activity.getSystemService(Context.ACTIVITY_SERVICE)
                as android.app.ActivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE
            } else {
                @Suppress("DEPRECATION")
                am.isInLockTaskMode
            }
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun getBluetoothEnabled(): Boolean {
        return try {
            val btManager = activity.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            btManager?.adapter?.isEnabled == true
        } catch (_: SecurityException) {
            false
        }
    }

    private fun getMacAddress(): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return getMacFromNetworkInterface() ?: "02:00:00:00:00:00"
        }
        return try {
            @Suppress("DEPRECATION")
            val wifiManager = activity.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            wifiManager.connectionInfo.macAddress ?: "02:00:00:00:00:00"
        } catch (_: Exception) {
            "02:00:00:00:00:00"
        }
    }

    private fun getMacFromNetworkInterface(): String? {
        return try {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
            for (ni in interfaces) {
                if (ni.name.equals("wlan0", ignoreCase = true)) {
                    val mac = ni.hardwareAddress ?: continue
                    return mac.joinToString(":") { String.format("%02X", it) }
                }
            }
            null
        } catch (_: Exception) {
            null
        }
    }
}
