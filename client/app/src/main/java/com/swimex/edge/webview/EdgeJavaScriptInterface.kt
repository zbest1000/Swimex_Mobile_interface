package com.swimex.edge.webview

import android.webkit.JavascriptInterface
import com.swimex.edge.kiosk.KioskActivity

/**
 * JavaScript interface bridge for native features:
 * - Kiosk exit (requires Admin/Maintenance auth via server)
 * - Bluetooth (when enabled by server feature flag)
 */
class EdgeJavaScriptInterface(private val activity: KioskActivity) {

    @JavascriptInterface
    fun exitKiosk() {
        activity.runOnUiThread {
            activity.exitKiosk()
        }
    }

    @JavascriptInterface
    fun getServerUrl(): String {
        return activity.getServerUrlForJs()
    }
}
