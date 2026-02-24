import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireRole, optionalAuth } from '../../auth/middleware';
import * as graphicsService from '../../graphics/graphics-service';
import { UserRole, GraphicFormat } from '../../shared/models';
import { ValidationError } from '../../utils/errors';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const editorRoles = [UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE];

router.get('/', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, format, limit, offset } = req.query;
    const result = graphicsService.listGraphics({
      category: category as string,
      search: search as string,
      format: format as GraphicFormat,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.assets, meta: { total: result.total } });
  } catch (err) { next(err); }
});

router.get('/categories', (_req: Request, res: Response) => {
  res.json({ success: true, data: graphicsService.getCategories() });
});

router.get('/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: graphicsService.getGraphic(req.params.id) });
  } catch (err) { next(err); }
});

router.get('/:id/file', (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = graphicsService.getGraphicFile(req.params.id);
    const graphic = graphicsService.getGraphic(req.params.id);
    const contentTypes: Record<string, string> = {
      SVG: 'image/svg+xml',
      PNG: 'image/png',
      JPEG: 'image/jpeg',
      WEBP: 'image/webp',
      GIF: 'image/gif',
    };
    res.setHeader('Content-Type', contentTypes[graphic.format] ?? 'application/octet-stream');
    res.send(file);
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireRole(...editorRoles), upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ValidationError('File is required');

    const { name, category, tags: tagsStr, format } = req.body;
    if (!name) throw new ValidationError('Name is required');

    const file = req.file.buffer;
    const detectedFormat = (format || detectFormat(req.file.originalname)) as GraphicFormat;
    const tags = tagsStr ? JSON.parse(tagsStr) : [];

    let svgContent: string | null = null;
    let elements: graphicsService.GraphicElementDTO[] = [];

    if (detectedFormat === GraphicFormat.SVG) {
      svgContent = file.toString('utf-8');
      elements = graphicsService.parseSvgElements(svgContent);
    }

    const asset = graphicsService.importGraphic(
      name,
      category ?? 'General',
      tags,
      detectedFormat,
      file,
      svgContent,
      elements,
      req.user!.userId,
    );

    res.status(201).json({ success: true, data: asset });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireRole(...editorRoles), (req: Request, res: Response, next: NextFunction) => {
  try {
    const asset = graphicsService.updateGraphic(req.params.id, req.body, req.user!.userId);
    res.json({ success: true, data: asset });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireRole(...editorRoles), (req: Request, res: Response, next: NextFunction) => {
  try {
    graphicsService.deleteGraphic(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

function detectFormat(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const map: Record<string, string> = {
    svg: 'SVG', png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG',
    webp: 'WEBP', gif: 'GIF', dxf: 'DXF',
  };
  return map[ext ?? ''] ?? 'PNG';
}

export default router;
