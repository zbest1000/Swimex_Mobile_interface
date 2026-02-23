package com.swimex.edge.webview

import android.graphics.Bitmap
import android.net.http.SslError
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Custom WebViewClient that handles SSL errors for local network,
 * intercepts page loading for connection status, and manages
 * the JavaScript interface bridge to native (kiosk exit, Bluetooth, etc.).
 */
class EdgeWebViewClient(
    private val onConnectionStatusChanged: (Boolean, String?) -> Unit
) : WebViewClient() {

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        onConnectionStatusChanged(true, url)
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        onConnectionStatusChanged(true, url)
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        super.onReceivedError(view, request, error)
        if (request?.isForMainFrame == true) {
            onConnectionStatusChanged(false, error?.description?.toString())
        }
    }

    override fun onReceivedSslError(
        view: WebView?,
        handler: SslErrorHandler?,
        error: SslError?
    ) {
        // For local network / development: allow self-signed certs
        // In production, consider stricter validation
        val host = error?.primaryError?.let { " (${error.url})" } ?: ""
        if (isLocalNetwork(error?.url)) {
            handler?.proceed()
        } else {
            onConnectionStatusChanged(false, "SSL error: ${error?.primaryError}$host")
            handler?.cancel()
        }
    }

    private fun isLocalNetwork(url: String?): Boolean {
        if (url == null) return false
        return url.contains("localhost") ||
            url.contains("127.0.0.1") ||
            url.contains("10.") ||
            url.contains("192.168.") ||
            url.contains("172.16.") ||
            url.contains("172.17.") ||
            url.contains("172.18.") ||
            url.contains("172.19.") ||
            url.contains("172.2") ||
            url.contains("172.30.") ||
            url.contains("172.31.")
    }
}
