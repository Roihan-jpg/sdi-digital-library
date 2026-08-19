import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('server route rendering', () => {
  it('keeps auth-dependent routes client-rendered until browser auth is restored', () => {
    const clientRenderedPaths = new Map(
      serverRoutes
        .filter((route) => route.renderMode === RenderMode.Client)
        .map((route) => [route.path, route.renderMode]),
    );

    expect(clientRenderedPaths.get('dashboard')).toBe(RenderMode.Client);
    expect(clientRenderedPaths.get('dashboard/**')).toBe(RenderMode.Client);
    expect(clientRenderedPaths.get('ganti-kata-sandi')).toBe(RenderMode.Client);
    expect(clientRenderedPaths.get('masuk')).toBe(RenderMode.Client);
  });
});
