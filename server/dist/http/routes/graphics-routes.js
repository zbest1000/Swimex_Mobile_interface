"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const middleware_1 = require("../../auth/middleware");
const graphicsService = __importStar(require("../../graphics/graphics-service"));
const models_1 = require("../../shared/models");
const errors_1 = require("../../utils/errors");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const editorRoles = [models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE];
router.get('/', middleware_1.optionalAuth, (req, res, next) => {
    try {
        const { category, search, format, limit, offset } = req.query;
        const result = graphicsService.listGraphics({
            category: category,
            search: search,
            format: format,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        res.json({ success: true, data: result.assets, meta: { total: result.total } });
    }
    catch (err) {
        next(err);
    }
});
router.get('/categories', (_req, res) => {
    res.json({ success: true, data: graphicsService.getCategories() });
});
router.get('/:id', middleware_1.optionalAuth, (req, res, next) => {
    try {
        res.json({ success: true, data: graphicsService.getGraphic(req.params.id) });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id/file', (req, res, next) => {
    try {
        const file = graphicsService.getGraphicFile(req.params.id);
        const graphic = graphicsService.getGraphic(req.params.id);
        const contentTypes = {
            SVG: 'image/svg+xml',
            PNG: 'image/png',
            JPEG: 'image/jpeg',
            WEBP: 'image/webp',
            GIF: 'image/gif',
        };
        res.setHeader('Content-Type', contentTypes[graphic.format] ?? 'application/octet-stream');
        res.send(file);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', middleware_1.authenticate, (0, middleware_1.requireRole)(...editorRoles), upload.single('file'), (req, res, next) => {
    try {
        if (!req.file)
            throw new errors_1.ValidationError('File is required');
        const { name, category, tags: tagsStr, format } = req.body;
        if (!name)
            throw new errors_1.ValidationError('Name is required');
        const file = req.file.buffer;
        const detectedFormat = (format || detectFormat(req.file.originalname));
        const tags = tagsStr ? JSON.parse(tagsStr) : [];
        let svgContent = null;
        let elements = [];
        if (detectedFormat === models_1.GraphicFormat.SVG) {
            svgContent = file.toString('utf-8');
            elements = graphicsService.parseSvgElements(svgContent);
        }
        const asset = graphicsService.importGraphic(name, category ?? 'General', tags, detectedFormat, file, svgContent, elements, req.user.userId);
        res.status(201).json({ success: true, data: asset });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', middleware_1.authenticate, (0, middleware_1.requireRole)(...editorRoles), (req, res, next) => {
    try {
        const asset = graphicsService.updateGraphic(req.params.id, req.body, req.user.userId);
        res.json({ success: true, data: asset });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', middleware_1.authenticate, (0, middleware_1.requireRole)(...editorRoles), (req, res, next) => {
    try {
        graphicsService.deleteGraphic(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
function detectFormat(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const map = {
        svg: 'SVG', png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG',
        webp: 'WEBP', gif: 'GIF', dxf: 'DXF',
    };
    return map[ext ?? ''] ?? 'PNG';
}
exports.default = router;
//# sourceMappingURL=graphics-routes.js.map