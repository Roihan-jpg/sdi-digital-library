import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppThemeService } from './core/theme/app-theme.service';

@Component({
  selector: 'sdi-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.app-theme--dark]': 'theme.isDark()',
    '[class.app-theme--light]': '!theme.isDark()',
  },
})
export class App {
  protected readonly theme = inject(AppThemeService);
}
