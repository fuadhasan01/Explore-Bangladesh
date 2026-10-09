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
import { TravelStateService } from './core/services/travel-state.service';
import { DistrictExplorer } from './features/travel-map/components/district-explorer/district-explorer';
import { DivisionProgress } from './features/travel-map/components/division-progress/division-progress';
import { MapExport } from './features/travel-map/components/map-export/map-export';

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
    DistrictExplorer,
    DivisionProgress,
    MapExport,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  readonly projectName = 'Explore Bangladesh';
  readonly travelState = inject(TravelStateService);

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
