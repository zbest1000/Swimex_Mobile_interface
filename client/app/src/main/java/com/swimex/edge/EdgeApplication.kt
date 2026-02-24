package com.swimex.edge

import android.app.Application
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import com.swimex.edge.bluetooth.BluetoothService
import com.swimex.edge.service.EdgeDeviceAdminReceiver
import com.swimex.edge.wifi.EdgeWifiManager

class EdgeApplication : Application() {

    lateinit var devicePolicyManager: DevicePolicyManager
        private set
    lateinit var adminComponentName: ComponentName
        private set
    lateinit var bluetoothService: BluetoothService
        private set
    lateinit var wifiManager: EdgeWifiManager
        private set

    override fun onCreate() {
        super.onCreate()
        devicePolicyManager =
            getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponentName =
            ComponentName(this, EdgeDeviceAdminReceiver::class.java)
        bluetoothService = BluetoothService(this)
        wifiManager = EdgeWifiManager(this)
    }

    fun isDeviceAdmin(): Boolean =
        devicePolicyManager.isAdminActive(adminComponentName)

    fun isDeviceOwner(): Boolean =
        devicePolicyManager.isDeviceOwnerApp(packageName)
}
