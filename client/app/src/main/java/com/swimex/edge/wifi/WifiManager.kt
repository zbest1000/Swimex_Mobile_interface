package com.swimex.edge.wifi

import android.annotation.SuppressLint
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.util.Log
import java.net.Inet4Address
import java.net.NetworkInterface

class EdgeWifiManager(private val context: Context) {

    interface WifiEventCallback {
        fun onConnected(ssid: String?)
        fun onDisconnected()
        fun onConnectionFailed(reason: String)
    }

    private val connectivityManager: ConnectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val wifiManager: WifiManager =
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

    private var callback: WifiEventCallback? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    fun setWifiEventCallback(cb: WifiEventCallback?) {
        callback = cb
    }

    @SuppressLint("MissingPermission")
    fun connectToNetwork(ssid: String, password: String?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            connectApi29Plus(ssid, password)
        } else {
            connectLegacy(ssid, password)
        }
    }

    private fun connectApi29Plus(ssid: String, password: String?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return

        val specifierBuilder = WifiNetworkSpecifier.Builder()
            .setSsid(ssid)

        if (!password.isNullOrEmpty()) {
            specifierBuilder.setWpa2Passphrase(password)
        }

        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .setNetworkSpecifier(specifierBuilder.build())
            .build()

        unregisterNetworkCallback()

        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.i(TAG, "Connected to WiFi network: $ssid")
                connectivityManager.bindProcessToNetwork(network)
                callback?.onConnected(ssid)
            }

            override fun onUnavailable() {
                Log.w(TAG, "WiFi network unavailable: $ssid")
                callback?.onConnectionFailed("Network unavailable: $ssid")
            }

            override fun onLost(network: Network) {
                Log.w(TAG, "WiFi network lost: $ssid")
                connectivityManager.bindProcessToNetwork(null)
                callback?.onDisconnected()
            }
        }

        networkCallback = cb
        connectivityManager.requestNetwork(request, cb)
    }

    @Suppress("DEPRECATION")
    @SuppressLint("MissingPermission")
    private fun connectLegacy(ssid: String, password: String?) {
        val config = WifiConfiguration().apply {
            SSID = "\"$ssid\""
            if (!password.isNullOrEmpty()) {
                preSharedKey = "\"$password\""
            } else {
                allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
            }
        }

        val netId = wifiManager.addNetwork(config)
        if (netId == -1) {
            callback?.onConnectionFailed("Failed to add network configuration")
            return
        }

        wifiManager.disconnect()
        val success = wifiManager.enableNetwork(netId, true)
        wifiManager.reconnect()

        if (!success) {
            callback?.onConnectionFailed("Failed to enable network")
        }
    }

    @SuppressLint("MissingPermission")
    fun getCurrentSsid(): String? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val network = connectivityManager.activeNetwork ?: return null
                val caps = connectivityManager.getNetworkCapabilities(network) ?: return null
                if (!caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return null
                val wifiInfo = caps.transportInfo as? WifiInfo ?: return null
                wifiInfo.ssid?.removeSurrounding("\"")
            } else {
                @Suppress("DEPRECATION")
                val info = wifiManager.connectionInfo
                info?.ssid?.removeSurrounding("\"")
            }
        } catch (_: Exception) {
            null
        }
    }

    fun getSignalStrength(): Int {
        val rssi = try {
            @Suppress("DEPRECATION")
            wifiManager.connectionInfo?.rssi ?: return 0
        } catch (_: Exception) {
            return 0
        }
        return WifiManager.calculateSignalLevel(rssi, 5)
    }

    fun isConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    fun getIpAddress(): String? {
        return try {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
            for (ni in interfaces) {
                if (!ni.isUp || ni.isLoopback) continue
                for (addr in ni.inetAddresses) {
                    if (addr is Inet4Address && !addr.isLoopbackAddress) {
                        return addr.hostAddress
                    }
                }
            }
            null
        } catch (_: Exception) {
            null
        }
    }

    fun getMacAddress(): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return getMacFromInterface() ?: "02:00:00:00:00:00"
        }
        return try {
            @Suppress("DEPRECATION")
            wifiManager.connectionInfo?.macAddress ?: "02:00:00:00:00:00"
        } catch (_: Exception) {
            "02:00:00:00:00:00"
        }
    }

    private fun getMacFromInterface(): String? {
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

    fun startMonitoring() {
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()

        val monitorCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.i(TAG, "WiFi available")
                callback?.onConnected(getCurrentSsid())
            }

            override fun onLost(network: Network) {
                Log.w(TAG, "WiFi lost")
                callback?.onDisconnected()
            }
        }

        connectivityManager.registerNetworkCallback(request, monitorCallback)
    }

    private fun unregisterNetworkCallback() {
        networkCallback?.let {
            try {
                connectivityManager.unregisterNetworkCallback(it)
            } catch (_: IllegalArgumentException) {}
        }
        networkCallback = null
    }

    fun destroy() {
        unregisterNetworkCallback()
    }

    companion object {
        private const val TAG = "EdgeWifiManager"
    }
}
