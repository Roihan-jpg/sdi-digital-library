import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';

import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideTanStackQuery } from '@tanstack/angular-query-experimental';

import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { queryCacheInterceptor } from './core/http/query-cache.interceptor';
import { requestIdInterceptor } from './core/http/request-id.interceptor';
import { APP_QUERY_CLIENT } from './core/query/query-client';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(),

    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      }),
    ),

    provideTanStackQuery(APP_QUERY_CLIENT),

    provideHttpClient(
      withInterceptors([
        requestIdInterceptor,
        authInterceptor,
        queryCacheInterceptor,
        errorInterceptor,
      ]),
    ),

    provideAppInitializer(() => inject(AuthService).initialize()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
