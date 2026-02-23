package com.swimex.edge

import android.app.Application
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import com.swimex.edge.service.EdgeDeviceAdminReceiver

class EdgeApplication : Application() {
    lateinit var devicePolicyManager: DevicePolicyManager
    lateinit var adminComponentName: ComponentName

    override fun onCreate() {
        super.onCreate()
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponentName = ComponentName(this, EdgeDeviceAdminReceiver::class.java)
    }

    fun isDeviceAdmin(): Boolean = devicePolicyManager.isAdminActive(adminComponentName)
}
