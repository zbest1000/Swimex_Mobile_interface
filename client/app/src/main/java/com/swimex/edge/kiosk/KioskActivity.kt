package com.swimex.edge.kiosk

import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.swimex.edge.EdgeApplication
import com.swimex.edge.R
import com.swimex.edge.webview.EdgeWebViewClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

class KioskActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingOverlay: FrameLayout
    private lateinit var progressIndicator: ProgressBar

    private val prefs by lazy {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
    }

    private val serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, getString(R.string.default_server_url)) ?: ""

    private var reconnectJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_kiosk)

        webView = findViewById(R.id.webview)
        loadingOverlay = findViewById(R.id.loading_overlay)
        progressIndicator = findViewById(R.id.progress_indicator)

        setupImmersiveFullscreen()
        setupWebView()
        startLockTask()
        startReconnectLoop()
    }

    override fun onResume() {
        super.onResume()
        setupImmersiveFullscreen()
    }

    private fun setupImmersiveFullscreen() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
        window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)

        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
    }

    private fun setupWebView() {
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true

        webView.webViewClient = EdgeWebViewClient { connected, _ ->
            runOnUiThread {
                if (connected) {
                    loadingOverlay.visibility = View.GONE
                } else {
                    loadingOverlay.visibility = View.VISIBLE
                }
            }
        }

        // JavaScript interface for kiosk exit, Bluetooth, etc.
        webView.addJavascriptInterface(
            EdgeJavaScriptInterface(this),
            JS_BRIDGE_NAME
        )

        loadUrl()
    }

    private fun loadUrl() {
        val url = serverUrl
        if (url.isNotBlank()) {
            webView.loadUrl(url)
        } else {
            loadingOverlay.visibility = View.VISIBLE
            Toast.makeText(this, R.string.no_server_url, Toast.LENGTH_SHORT).show()
        }
    }

    private fun startReconnectLoop() {
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            while (isActive) {
                delay(RECONNECT_INTERVAL_MS)
                if (serverUrl.isNotBlank() && !isServerReachable()) {
                    runOnUiThread { loadUrl() }
                }
            }
        }
    }

    private fun isServerReachable(): Boolean {
        return try {
            val url = URL(serverUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 3000
            connection.readTimeout = 3000
            connection.requestMethod = "HEAD"
            val responseCode = connection.responseCode
            connection.disconnect()
            responseCode in 200..399
        } catch (_: Exception) {
            false
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return true
                }
            }
            KeyEvent.KEYCODE_HOME, KeyEvent.KEYCODE_APP_SWITCH -> {
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    fun getServerUrlForJs(): String = serverUrl

    fun exitKiosk() {
        val app = application as EdgeApplication
        if (app.isDeviceAdmin()) {
            stopLockTask()
            finish()
        } else {
            // Requires Admin/Maintenance auth via server API
            requestExitViaServer()
        }
    }

    private fun requestExitViaServer() {
        scope.launch(Dispatchers.IO) {
            try {
                val exitUrl = "$serverUrl/api/kiosk/exit"
                val url = URL(exitUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.outputStream.close()
                val responseCode = connection.responseCode
                connection.disconnect()

                if (responseCode in 200..299) {
                    runOnUiThread {
                        stopLockTask()
                        finish()
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(
                            this@KioskActivity,
                            R.string.exit_requires_auth,
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            } catch (_: Exception) {
                runOnUiThread {
                    Toast.makeText(
                        this@KioskActivity,
                        R.string.exit_requires_auth,
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    override fun onDestroy() {
        reconnectJob?.cancel()
        super.onDestroy()
    }

    companion object {
        private const val PREFS_NAME = "edge_prefs"
        const val KEY_SERVER_URL = "server_url"
        private const val RECONNECT_INTERVAL_MS = 5000L
        private const val JS_BRIDGE_NAME = "EdgeBridge"
    }
}
