package com.swimex.edge.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

@SuppressLint("MissingPermission")
class BluetoothService(private val context: Context) {

    interface ConnectionCallback {
        fun onConnected(deviceAddress: String)
        fun onDisconnected(deviceAddress: String)
        fun onConnectionFailed(deviceAddress: String, error: String)
        fun onDataReceived(data: ByteArray)
        fun onBluetoothStateChanged(enabled: Boolean)
    }

    var enabled: Boolean = false
        private set

    private val bluetoothManager: BluetoothManager? =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager

    private val bluetoothAdapter: BluetoothAdapter? =
        bluetoothManager?.adapter

    private var socket: BluetoothSocket? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null
    private var callback: ConnectionCallback? = null
    private var connectedAddress: String? = null

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var readJob: Job? = null

    private val bluetoothReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            if (intent.action == BluetoothAdapter.ACTION_STATE_CHANGED) {
                val state = intent.getIntExtra(
                    BluetoothAdapter.EXTRA_STATE,
                    BluetoothAdapter.ERROR
                )
                when (state) {
                    BluetoothAdapter.STATE_OFF -> {
                        Log.i(TAG, "Bluetooth turned off")
                        disconnect()
                        callback?.onBluetoothStateChanged(false)
                    }
                    BluetoothAdapter.STATE_ON -> {
                        Log.i(TAG, "Bluetooth turned on")
                        callback?.onBluetoothStateChanged(true)
                    }
                }
            }
        }
    }

    init {
        val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(bluetoothReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(bluetoothReceiver, filter)
        }
    }

    fun setCallback(cb: ConnectionCallback?) {
        callback = cb
    }

    fun setEnabled(value: Boolean) {
        enabled = value
        if (!value) disconnect()
    }

    fun isConnected(): Boolean =
        socket?.isConnected == true

    fun isBluetoothAvailable(): Boolean =
        bluetoothAdapter != null

    fun isBluetoothOn(): Boolean =
        bluetoothAdapter?.isEnabled == true

    fun connect(macAddress: String) {
        if (!enabled) {
            Log.w(TAG, "Bluetooth service not enabled, ignoring connect")
            return
        }
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            callback?.onConnectionFailed(macAddress, "Bluetooth is not available or disabled")
            return
        }

        scope.launch {
            try {
                disconnect()

                val device: BluetoothDevice = bluetoothAdapter.getRemoteDevice(macAddress)
                val rfcommSocket = device.createRfcommSocketToServiceRecord(RFCOMM_UUID)
                bluetoothAdapter.cancelDiscovery()

                rfcommSocket.connect()

                socket = rfcommSocket
                inputStream = rfcommSocket.inputStream
                outputStream = rfcommSocket.outputStream
                connectedAddress = macAddress

                Log.i(TAG, "Connected to $macAddress")
                withContext(Dispatchers.Main) {
                    callback?.onConnected(macAddress)
                }

                startReceiving()
            } catch (e: IOException) {
                Log.e(TAG, "Connection failed to $macAddress", e)
                closeSocket()
                withContext(Dispatchers.Main) {
                    callback?.onConnectionFailed(macAddress, e.message ?: "Connection failed")
                }
            } catch (e: IllegalArgumentException) {
                Log.e(TAG, "Invalid MAC address: $macAddress", e)
                withContext(Dispatchers.Main) {
                    callback?.onConnectionFailed(macAddress, "Invalid MAC address")
                }
            }
        }
    }

    fun disconnect() {
        readJob?.cancel()
        readJob = null
        val address = connectedAddress
        closeSocket()
        connectedAddress = null
        if (address != null) {
            callback?.onDisconnected(address)
        }
    }

    fun sendData(data: ByteArray) {
        scope.launch {
            try {
                outputStream?.write(data)
                outputStream?.flush()
            } catch (e: IOException) {
                Log.e(TAG, "Error sending data", e)
                val addr = connectedAddress ?: "unknown"
                disconnect()
                withContext(Dispatchers.Main) {
                    callback?.onConnectionFailed(addr, "Write failed: ${e.message}")
                }
            }
        }
    }

    private fun startReceiving() {
        readJob?.cancel()
        readJob = scope.launch {
            val buffer = ByteArray(READ_BUFFER_SIZE)
            while (isActive) {
                try {
                    val stream = inputStream ?: break
                    val bytesRead = stream.read(buffer)
                    if (bytesRead == -1) {
                        break
                    }
                    val data = buffer.copyOf(bytesRead)
                    withContext(Dispatchers.Main) {
                        callback?.onDataReceived(data)
                    }
                } catch (e: IOException) {
                    if (isActive) {
                        Log.e(TAG, "Read error", e)
                    }
                    break
                } catch (_: CancellationException) {
                    break
                }
            }

            val addr = connectedAddress
            if (addr != null) {
                closeSocket()
                connectedAddress = null
                withContext(Dispatchers.Main) {
                    callback?.onDisconnected(addr)
                }
            }
        }
    }

    private fun closeSocket() {
        try { inputStream?.close() } catch (_: IOException) {}
        try { outputStream?.close() } catch (_: IOException) {}
        try { socket?.close() } catch (_: IOException) {}
        inputStream = null
        outputStream = null
        socket = null
    }

    fun destroy() {
        readJob?.cancel()
        scope.cancel()
        closeSocket()
        try {
            context.unregisterReceiver(bluetoothReceiver)
        } catch (_: IllegalArgumentException) {}
    }

    companion object {
        private const val TAG = "BluetoothService"
        private val RFCOMM_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private const val READ_BUFFER_SIZE = 1024
    }
}
