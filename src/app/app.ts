import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  LucideArrowRight,
  LucideCompass,
  LucideDownload,
  LucideMap,
  LucideMapPin,
  LucideMenu,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LucideArrowRight,
    LucideCompass,
    LucideDownload,
    LucideMap,
    LucideMapPin,
    LucideMenu,
    LucideX,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly projectName = 'Explore Bangladesh';

  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
