package com.swimex.edge.bluetooth

import android.content.Context

/**
 * Bluetooth service skeleton for EDGE server connection.
 * Manages Bluetooth connection to the EDGE server.
 * Disabled by default - controlled by feature flag from server.
 */
class BluetoothService(private val context: Context) {

    private var enabled: Boolean = false
    private var connected: Boolean = false

    /**
     * Enable or disable Bluetooth based on server feature flag.
     */
    fun setEnabled(enabled: Boolean) {
        this.enabled = enabled
        if (!enabled) {
            disconnect()
        }
    }

    fun isEnabled(): Boolean = enabled

    fun isConnected(): Boolean = connected

    /**
     * Connect to the EDGE server via Bluetooth.
     */
    fun connect() {
        if (!enabled) return
        // TODO: Implement Bluetooth connection logic
        connected = false
    }

    /**
     * Disconnect from the EDGE server.
     */
    fun disconnect() {
        // TODO: Implement Bluetooth disconnect logic
        connected = false
    }
}
