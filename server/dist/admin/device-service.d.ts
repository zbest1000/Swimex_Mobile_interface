import { DeviceType } from '../shared/models';
export interface DeviceDTO {
    id: string;
    macAddress: string;
    deviceName: string;
    deviceType: DeviceType;
    isRegistered: boolean;
    registeredBy: string | null;
    registeredAt: string;
    lastSeenAt: string;
}
export declare function listDevices(): DeviceDTO[];
export declare function getDevice(id: string): DeviceDTO;
export declare function getDeviceByMAC(mac: string): DeviceDTO | null;
export declare function registerDevice(macAddress: string, deviceName: string, deviceType: DeviceType, registeredBy: string): DeviceDTO;
export declare function revokeDevice(id: string, actorId: string): void;
export declare function deleteDevice(id: string, actorId: string): void;
export declare function isDeviceRegistered(mac: string): boolean;
export declare function trackDeviceSeen(mac: string): void;
//# sourceMappingURL=device-service.d.ts.map