import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import {
  LucideArrowRight,
  LucideCompass,
  LucideDownload,
  LucideMap,
  LucideMapPin,
  LucideMenu,
  LucideX,
} from '@lucide/angular';
import { DistrictGeoJsonService } from './core/services/district-geojson.service';
import { BangladeshMap } from './features/travel-map/components/bangladesh-map/bangladesh-map';

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
    BangladeshMap,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  readonly projectName = 'Explore Bangladesh';

  readonly menuOpen = signal(false);

  readonly geoData = inject(DistrictGeoJsonService);

  ngOnInit(): void {
    void this.geoData.load();
  }
  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
