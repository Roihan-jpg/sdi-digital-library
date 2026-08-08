import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js'; import type { AuthServicePort } from '../auth/auth.types.js';
import { bookCopySchema, bookTitleSchema, catalogQuerySchema, idSchema, labelSchema } from './catalog.schema.js'; import { CatalogService } from './catalog.service.js';
export function createCatalogRouter(authService: AuthServicePort, service: CatalogService): Router { const router=Router();
  router.get('/',async(req,res)=>{const q=catalogQuerySchema.parse(req.query);const result=await service.listPublic(q);res.json({data:result.items,pagination:{page:q.page,limit:q.limit,total:result.total}})});
  router.post('/titles',authenticate(authService),authorize('librarian'),async(req,res)=>res.status(201).json({data:await service.createTitle(req.auth!,bookTitleSchema.parse(req.body))}));
  router.put('/titles/:id',authenticate(authService),authorize('librarian'),async(req,res)=>res.json({data:await service.updateTitle(req.auth!,idSchema.parse(req.params['id']),bookTitleSchema.parse(req.body))}));
  router.delete('/titles/:id',authenticate(authService),authorize('librarian'),async(req,res)=>{await service.removeTitle(req.auth!,idSchema.parse(req.params['id']));res.status(204).send();});
  router.post('/copies',authenticate(authService),authorize('librarian'),async(req,res)=>res.status(201).json({data:await service.createCopy(req.auth!,bookCopySchema.parse(req.body))}));
  router.put('/copies/:id',authenticate(authService),authorize('librarian'),async(req,res)=>res.json({data:await service.updateCopy(req.auth!,idSchema.parse(req.params['id']),bookCopySchema.parse(req.body))}));
  router.delete('/copies/:id',authenticate(authService),authorize('librarian'),async(req,res)=>{await service.removeCopy(req.auth!,idSchema.parse(req.params['id']));res.status(204).send();});
  router.get('/copies/:id/history',authenticate(authService),authorize('head_librarian','librarian'),async(req,res)=>res.json({data:await service.history(idSchema.parse(req.params['id']))}));
  router.post('/labels/print',authenticate(authService),authorize('librarian'),async(req,res)=>{const input=labelSchema.parse(req.body);res.type('html').send(await service.labels(input.copyIds,input.format))});
  router.get('/:id',async(req,res)=>res.json({data:await service.getPublic(idSchema.parse(req.params['id']))})); return router; }
