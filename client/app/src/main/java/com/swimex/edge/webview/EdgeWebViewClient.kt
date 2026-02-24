package com.swimex.edge.webview

import android.graphics.Bitmap
import android.net.http.SslError
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient

class EdgeWebViewClient(
    private val onConnectionStatusChanged: (connected: Boolean, detail: String?) -> Unit,
    private val onHttpError: ((statusCode: Int) -> Unit)? = null
) : WebViewClient() {

    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val url = request?.url?.toString() ?: return false
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return false
        }
        return true
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
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

    override fun onReceivedHttpError(
        view: WebView?,
        request: WebResourceRequest?,
        errorResponse: WebResourceResponse?
    ) {
        super.onReceivedHttpError(view, request, errorResponse)
        if (request?.isForMainFrame == true) {
            val statusCode = errorResponse?.statusCode ?: return
            onHttpError?.invoke(statusCode)
        }
    }

    override fun onReceivedSslError(
        view: WebView?,
        handler: SslErrorHandler?,
        error: SslError?
    ) {
        if (isLocalNetwork(error?.url)) {
            handler?.proceed()
        } else {
            onConnectionStatusChanged(false, "SSL error: ${error?.primaryError} (${error?.url})")
            handler?.cancel()
        }
    }

    private fun isLocalNetwork(url: String?): Boolean {
        if (url == null) return false
        return url.contains("localhost") ||
            url.contains("127.0.0.1") ||
            url.contains("10.") ||
            url.contains("192.168.") ||
            Regex("172\\.(1[6-9]|2[0-9]|3[01])\\.").containsMatchIn(url)
    }
}
