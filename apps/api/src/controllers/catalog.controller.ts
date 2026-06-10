import { Request, Response } from 'express';
import { categoryService } from '../services/catalog/category.service';
import { productService } from '../services/catalog/product.service';
import { asyncHandler } from '../middleware/asyncHandler';

export const catalogController = {
  categories: asyncHandler(async (req: Request, res: Response) => {
    const cats = await categoryService.getAll();
    res.json({ success: true, data: cats });
  }),

  categoriesTree: asyncHandler(async (req: Request, res: Response) => {
    const tree = await categoryService.getTree();
    res.json({ success: true, data: tree });
  }),

  categoryBySlug: asyncHandler(async (req: Request, res: Response) => {
    const cat = await categoryService.getBySlug(req.params.slug);
    res.json({ success: true, data: cat });
  }),

  products: asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      categoryId: req.query.categoryId as string,
      search: req.query.search as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      sortBy: (req.query.sortBy as string) || 'new',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    };

    const result = await productService.list(filters);
    res.json({ success: true, data: result });
  }),

  productBySlug: asyncHandler(async (req: Request, res: Response) => {
    const prod = await productService.getBySlug(req.params.slug);
    res.json({ success: true, data: prod });
  }),

  createProduct: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const prod = await productService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: prod });
  }),

  updateProduct: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const prod = await productService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: prod });
  }),
};
