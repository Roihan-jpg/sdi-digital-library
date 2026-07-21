import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'koleksi-digital/:slug',
    renderMode: RenderMode.Client,
  },
  {
    path: 'koleksi-digital',
    renderMode: RenderMode.Client,
  },
  {
    path: 'katalog',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
