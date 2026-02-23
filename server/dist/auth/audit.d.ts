export declare function auditLog(action: string, actorId: string | null, targetType: string, targetId: string | null, details?: Record<string, unknown>, sourceIp?: string): void;
export declare function getAuditLogs(options: {
    limit?: number;
    offset?: number;
    action?: string;
    actorId?: string;
    targetType?: string;
}): {
    entries: Record<string, unknown>[];
    total: number;
};
//# sourceMappingURL=audit.d.ts.map