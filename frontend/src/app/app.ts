import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppThemeService } from './core/theme/app-theme.service';
import { AuthStore } from './core/auth/auth.store';
import { AuthSplash } from './shared/components/auth-splash/auth-splash';

@Component({
  selector: 'sdi-root',
  imports: [RouterOutlet, AuthSplash],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.app-theme--dark]': 'theme.isDark()',
    '[class.app-theme--light]': '!theme.isDark()',
  },
})
export class App {
  protected readonly theme = inject(AppThemeService);
  protected readonly authStore = inject(AuthStore);
}
