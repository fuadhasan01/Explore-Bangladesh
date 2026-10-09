
import {
  DOCUMENT,
  isPlatformBrowser,
} from '@angular/common';

import {
  Injectable,
  PLATFORM_ID,
  effect,
  inject,
  signal,
} from '@angular/core';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'explore-bangladesh:theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser =
    isPlatformBrowser(this.platformId);

  private readonly _theme =
    signal<AppTheme>(this.getInitialTheme());

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const theme = this._theme();

      if (!this.isBrowser) {
        return;
      }

      // Apply theme to the entire application.
      this.document.documentElement.setAttribute(
        'data-theme',
        theme
      );

      // Save the selected preference.
      try {
        this.document.defaultView?.localStorage.setItem(
          THEME_STORAGE_KEY,
          theme
        );
      } catch {
        // Continue without persistence when
        // browser storage is unavailable.
      }
    });
  }

  toggleTheme(): void {
    this._theme.update(current =>
      current === 'light' ? 'dark' : 'light'
    );
  }

  setTheme(theme: AppTheme): void {
    this._theme.set(theme);
  }

  private getInitialTheme(): AppTheme {
    if (!this.isBrowser) {
      return 'light';
    }

    const win = this.document.defaultView;

    try {
      const saved = win?.localStorage.getItem(
        THEME_STORAGE_KEY
      );

      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Fall back to the system preference.
    }

    return win?.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
      ? 'dark'
      : 'light';
  }
}
