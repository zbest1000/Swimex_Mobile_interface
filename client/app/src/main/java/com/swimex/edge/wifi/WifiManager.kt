package com.swimex.edge.wifi

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager as AndroidWifiManager
import android.os.Build

/**
 * WiFi management helper for the EDGE client.
 * Connects to the configured SSID, monitors connection state,
 * and reports signal strength.
 */
class EdgeWifiManager(private val context: Context) {

    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val wifiManager =
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as AndroidWifiManager

    private var configuredSsid: String? = null
    private var connectionCallback: ((Boolean, Int?) -> Unit)? = null

    /**
     * Configure the SSID to connect to.
     */
    fun setConfiguredSsid(ssid: String?) {
        configuredSsid = ssid
    }

    /**
     * Register a callback for connection state changes.
     * Callback receives (isConnected, signalStrengthRssi).
     */
    fun setConnectionCallback(callback: ((Boolean, Int?) -> Unit)?) {
        connectionCallback = callback
    }

    /**
     * Connect to the configured SSID.
     */
    fun connectToConfiguredSsid() {
        // TODO: Implement WiFi connection to configured SSID
        // Requires appropriate permissions and possibly WifiNetworkSpecifier on Android 10+
    }

    /**
     * Check if WiFi is connected.
     */
    fun isConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    /**
     * Get current WiFi signal strength in dBm (RSSI).
     * Returns null if not connected via WiFi.
     */
    fun getSignalStrength(): Int? {
        if (!isConnected()) return null
        val wifiInfo = wifiManager.connectionInfo
        return if (wifiInfo.bssid != null) wifiInfo.rssi else null
    }

    /**
     * Start monitoring WiFi connection state.
     */
    fun startMonitoring() {
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()

        connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                val rssi = getSignalStrength()
                connectionCallback?.invoke(true, rssi)
            }

            override fun onLost(network: Network) {
                connectionCallback?.invoke(false, null)
            }
        })
    }
}
