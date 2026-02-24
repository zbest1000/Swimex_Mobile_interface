package com.swimex.edge.kiosk

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.pm.ActivityInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.swimex.edge.R
import com.swimex.edge.webview.EdgeJavaScriptInterface
import com.swimex.edge.webview.EdgeWebViewClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class KioskActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingOverlay: FrameLayout
    private lateinit var errorOverlay: FrameLayout
    private lateinit var progressIndicator: ProgressBar
    private lateinit var errorDetailText: TextView
    private lateinit var btnConfigureServer: Button

    private val prefs by lazy {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
    }

    private val serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL

    private var reconnectJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private val connectivityManager: ConnectivityManager by lazy {
        getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    // ─── Lifecycle ───────────────────────────────────────────────────

    @SuppressLint("SourceLockedOrientationActivity")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        setContentView(R.layout.activity_kiosk)

        webView = findViewById(R.id.webview)
        loadingOverlay = findViewById(R.id.loading_overlay)
        errorOverlay = findViewById(R.id.error_overlay)
        progressIndicator = findViewById(R.id.progress_indicator)
        errorDetailText = findViewById(R.id.error_detail_text)
        btnConfigureServer = findViewById(R.id.btn_configure_server)

        btnConfigureServer.setOnClickListener { showSetupDialog() }

        setupImmersiveFullscreen()
        setupWebView()
        registerNetworkCallback()

        try {
            startLockTask()
        } catch (e: Exception) {
            Log.w(TAG, "startLockTask failed (device may not be provisioned): ${e.message}")
        }

        if (isFirstRun()) {
            showSetupDialog()
        } else {
            loadUrl()
        }
    }

    override fun onResume() {
        super.onResume()
        setupImmersiveFullscreen()
    }

    override fun onPause() {
        super.onPause()
        setupImmersiveFullscreen()
    }

    override fun onDestroy() {
        reconnectJob?.cancel()
        scope.cancel()
        unregisterNetworkCallback()
        webView.destroy()
        super.onDestroy()
    }

    // ─── Immersive mode ──────────────────────────────────────────────

    @Suppress("DEPRECATION")
    private fun setupImmersiveFullscreen() {
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )

        window.decorView.setOnSystemUiVisibilityChangeListener {
            setupImmersiveFullscreen()
        }
    }

    // ─── WebView ─────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            loadWithOverviewMode = true
            useWideViewPort = true
        }

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        webView.isScrollbarFadingEnabled = true

        webView.webViewClient = EdgeWebViewClient(
            onConnectionStatusChanged = { connected, detail ->
                runOnUiThread {
                    if (connected) {
                        loadingOverlay.visibility = View.GONE
                        errorOverlay.visibility = View.GONE
                        stopReconnectLoop()
                    } else {
                        loadingOverlay.visibility = View.GONE
                        errorOverlay.visibility = View.VISIBLE
                        errorDetailText.text = detail ?: getString(R.string.retrying_message)
                        startReconnectLoop()
                    }
                }
            },
            onHttpError = { statusCode ->
                runOnUiThread {
                    when (statusCode) {
                        401 -> Toast.makeText(this, R.string.http_unauthorized, Toast.LENGTH_SHORT).show()
                        403 -> Toast.makeText(this, R.string.http_forbidden, Toast.LENGTH_SHORT).show()
                    }
                }
            }
        )

        webView.addJavascriptInterface(
            EdgeJavaScriptInterface(this),
            JS_BRIDGE_NAME
        )
    }

    private fun loadUrl() {
        val url = serverUrl
        if (url.isNotBlank()) {
            loadingOverlay.visibility = View.VISIBLE
            errorOverlay.visibility = View.GONE
            webView.loadUrl(url)
        } else {
            errorOverlay.visibility = View.VISIBLE
            errorDetailText.text = getString(R.string.no_server_url)
        }
    }

    // ─── Reconnection loop ───────────────────────────────────────────

    private fun startReconnectLoop() {
        if (reconnectJob?.isActive == true) return

        reconnectJob = scope.launch {
            while (isActive) {
                delay(RECONNECT_INTERVAL_MS)
                val reachable = withContext(Dispatchers.IO) { isServerReachable() }
                if (reachable) {
                    loadUrl()
                    break
                }
            }
        }
    }

    private fun stopReconnectLoop() {
        reconnectJob?.cancel()
        reconnectJob = null
    }

    private fun isServerReachable(): Boolean {
        return try {
            val url = URL(serverUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 3000
            connection.readTimeout = 3000
            connection.requestMethod = "HEAD"
            connection.instanceFollowRedirects = false
            val responseCode = connection.responseCode
            connection.disconnect()
            responseCode in 200..399
        } catch (_: Exception) {
            false
        }
    }

    // ─── Network change listener ─────────────────────────────────────

    private fun registerNetworkCallback() {
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()

        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.i(TAG, "WiFi available — reloading WebView")
                runOnUiThread {
                    if (errorOverlay.visibility == View.VISIBLE) {
                        loadUrl()
                    }
                }
            }

            override fun onLost(network: Network) {
                Log.w(TAG, "WiFi lost")
                runOnUiThread {
                    loadingOverlay.visibility = View.GONE
                    errorOverlay.visibility = View.VISIBLE
                    errorDetailText.text = getString(R.string.retrying_message)
                    startReconnectLoop()
                }
            }
        }
        networkCallback = cb
        connectivityManager.registerNetworkCallback(request, cb)
    }

    private fun unregisterNetworkCallback() {
        networkCallback?.let {
            try { connectivityManager.unregisterNetworkCallback(it) } catch (_: Exception) {}
        }
        networkCallback = null
    }

    // ─── Key interception ────────────────────────────────────────────

    @Suppress("DEPRECATION")
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                }
                true
            }
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_APP_SWITCH,
            KeyEvent.KEYCODE_MENU -> true
            else -> super.onKeyDown(keyCode, event)
        }
    }

    // ─── JS bridge helpers ───────────────────────────────────────────

    fun getServerUrlForJs(): String = serverUrl

    // ─── Exit kiosk with auth ────────────────────────────────────────

    fun exitKiosk(username: String, password: String) {
        scope.launch(Dispatchers.IO) {
            try {
                val loginUrl = "${serverUrl.trimEnd('/')}/api/auth/login"
                val url = URL(loginUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.doOutput = true

                val body = JSONObject().apply {
                    put("username", username)
                    put("password", password)
                }
                connection.outputStream.bufferedWriter().use { it.write(body.toString()) }

                val responseCode = connection.responseCode

                if (responseCode in 200..299) {
                    val responseBody = BufferedReader(
                        InputStreamReader(connection.inputStream)
                    ).use { it.readText() }
                    connection.disconnect()

                    val json = JSONObject(responseBody)
                    val user = json.optJSONObject("user") ?: json
                    val role = user.optString("role", "")

                    if (role.equals("ADMIN", ignoreCase = true) ||
                        role.equals("MAINTENANCE", ignoreCase = true)
                    ) {
                        withContext(Dispatchers.Main) {
                            try { stopLockTask() } catch (_: Exception) {}
                            finish()
                        }
                    } else {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(
                                this@KioskActivity,
                                R.string.exit_requires_auth,
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                } else {
                    connection.disconnect()
                    withContext(Dispatchers.Main) {
                        Toast.makeText(
                            this@KioskActivity,
                            R.string.exit_auth_failed,
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            } catch (_: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(
                        this@KioskActivity,
                        R.string.exit_network_error,
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    // ─── First-run setup dialog ──────────────────────────────────────

    private fun isFirstRun(): Boolean =
        !prefs.contains(KEY_SERVER_URL)

    private fun showSetupDialog() {
        val input = EditText(this).apply {
            hint = getString(R.string.enter_server_url)
            setText(serverUrl)
            setSingleLine()
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(this)
            .setTitle(R.string.setup_title)
            .setMessage(R.string.setup_message)
            .setView(input)
            .setCancelable(prefs.contains(KEY_SERVER_URL))
            .setPositiveButton(R.string.save) { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    prefs.edit().putString(KEY_SERVER_URL, newUrl).apply()
                    Toast.makeText(this, R.string.server_url_saved, Toast.LENGTH_SHORT).show()
                    loadUrl()
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    companion object {
        private const val TAG = "KioskActivity"
        const val PREFS_NAME = "edge_prefs"
        const val KEY_SERVER_URL = "server_url"
        private const val DEFAULT_SERVER_URL = "http://192.168.1.1"
        private const val RECONNECT_INTERVAL_MS = 5000L
        private const val JS_BRIDGE_NAME = "EdgeBridge"
    }
}
