export interface FeatureFlagDTO {
    id: string;
    featureKey: string;
    displayName: string;
    description: string;
    isEnabled: boolean;
    isVisible: boolean;
    enabledBy: string | null;
    enabledAt: string | null;
    updatedAt: string;
}
export declare function listFlags(): FeatureFlagDTO[];
export declare function getFlag(key: string): FeatureFlagDTO | null;
export declare function isFlagEnabled(key: string): boolean;
export declare function isFlagVisible(key: string): boolean;
export declare function setFlag(key: string, enabled: boolean, visible: boolean, actorId: string): FeatureFlagDTO;
//# sourceMappingURL=feature-flag-service.d.ts.map