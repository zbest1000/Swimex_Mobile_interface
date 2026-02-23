"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const auth_routes_1 = __importDefault(require("./routes/auth-routes"));
const user_routes_1 = __importDefault(require("./routes/user-routes"));
const workout_routes_1 = __importDefault(require("./routes/workout-routes"));
const admin_routes_1 = __importDefault(require("./routes/admin-routes"));
const graphics_routes_1 = __importDefault(require("./routes/graphics-routes"));
const log = (0, logger_1.createLogger)('http');
function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Request logging
    app.use((req, _res, next) => {
        log.debug(`${req.method} ${req.path}`);
        next();
    });
    // Health check
    app.get('/api/health', (_req, res) => {
        res.json({
            success: true,
            data: {
                status: 'healthy',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            },
        });
    });
    // API routes
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/users', user_routes_1.default);
    app.use('/api/workouts', workout_routes_1.default);
    app.use('/api/admin', admin_routes_1.default);
    app.use('/api/graphics', graphics_routes_1.default);
    // Serve static frontend files
    const publicPath = path_1.default.resolve(__dirname, '../../public');
    app.use(express_1.default.static(publicPath));
    // SPA fallback — serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found' } });
        }
        res.sendFile(path_1.default.join(publicPath, 'index.html'), (err) => {
            if (err)
                next(err);
        });
    });
    // Error handler
    app.use((err, _req, res, _next) => {
        if (err instanceof errors_1.AppError) {
            res.status(err.statusCode).json({
                success: false,
                error: { code: err.code, message: err.message },
            });
        }
        else {
            log.error('Unhandled error', { message: err.message, stack: err.stack });
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_ERROR', message: 'Internal server error' },
            });
        }
    });
    return app;
}
//# sourceMappingURL=server.js.map