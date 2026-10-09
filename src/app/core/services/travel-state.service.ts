
import {
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  isDevMode,
  signal,
  untracked,
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

import { DistrictGeoJsonService } from './district-geojson.service';

import { DIVISION_NAMES } from '../constants/divisions';

const STORAGE_KEY = 'explore-bangladesh:travel:v1';
const STORAGE_VERSION = 1;

interface SavedTravelState {
  version: number;
  visitedDistrictIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class TravelStateService {
  private readonly geoData = inject(DistrictGeoJsonService);

  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _visitedDistrictIds = signal<ReadonlySet<string>>(new Set<string>());

  private readonly _hydrated = signal(false);

  readonly visitedDistrictIds = this._visitedDistrictIds.asReadonly();

  readonly hydrated = this._hydrated.asReadonly();

  readonly totalDistricts = computed(() => this.geoData.districtCount());

  readonly visitedCount = computed(() => this._visitedDistrictIds().size);

  readonly remainingCount = computed(() =>
    Math.max(0, this.totalDistricts() - this.visitedCount()),
  );

  readonly progressPercentage = computed(() => {
    const total = this.totalDistricts();

    return total === 0 ? 0 : Math.round((this.visitedCount() / total) * 100);
  });

  readonly divisionProgress = computed(() => {
    const features = this.geoData.data()?.features ?? [];

    const visitedIds = this._visitedDistrictIds();

    return DIVISION_NAMES.map((name) => {
      const districts = features.filter((feature) => feature.properties.ADM1_EN === name);

      const visited = districts.filter((feature) =>
        visitedIds.has(feature.properties.ADM2_PCODE),
      ).length;

      const total = districts.length;

      return {
        name,
        total,
        visited,
        remaining: total - visited,
        percentage: total === 0 ? 0 : Math.round((visited / total) * 100),
      };
    });
  });

  constructor() {
    // 1. Restore saved progress once GeoJSON is ready.
    effect(() => {
      const data = this.geoData.data();

      if (!data || this._hydrated()) {
        return;
      }

      untracked(() => {
        const validIds = new Set(data.features.map((feature) => feature.properties.ADM2_PCODE));

        const savedIds = this.readSavedIds();

        const restoredIds = savedIds.filter((id) => validIds.has(id));

        this._visitedDistrictIds.set(new Set(restoredIds));

        this._hydrated.set(true);
      });
    });

    // 2. Save whenever selected district IDs change.
    effect(() => {
      if (!this._hydrated()) {
        return;
      }

      const visitedIds = this._visitedDistrictIds();

      const savedState: SavedTravelState = {
        version: STORAGE_VERSION,
        visitedDistrictIds: [...visitedIds],
      };

      this.writeSavedState(savedState);
    });
  }

  // Read previously saved district IDs.
  private readSavedIds(): string[] {
    if (!this.isBrowser) {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('version' in parsed) ||
        parsed.version !== STORAGE_VERSION ||
        !('visitedDistrictIds' in parsed) ||
        !Array.isArray(parsed.visitedDistrictIds)
      ) {
        return [];
      }

      return parsed.visitedDistrictIds.filter(
        (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0,
      );
    } catch (error) {
      if (isDevMode()) {
        console.warn('Unable to restore travel progress:', error);
      }

      return [];
    }
  }

  // Save travel progress safely.
  private writeSavedState(state: SavedTravelState): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      if (isDevMode()) {
        console.warn('Unable to save travel progress:', error);
      }
    }
  }

  isVisited(districtId: string): boolean {
    return this._visitedDistrictIds().has(districtId);
  }

  toggleDistrict(districtId: string): void {
    if (!this._hydrated() || !this.isValidDistrict(districtId)) {
      return;
    }

    this._visitedDistrictIds.update((current) => {
      const updated = new Set(current);

      if (updated.has(districtId)) {
        updated.delete(districtId);
      } else {
        updated.add(districtId);
      }

      return updated;
    });
  }

  selectAll(): void {
    if (!this._hydrated()) {
      return;
    }

    const ids = this.geoData.data()?.features.map((feature) => feature.properties.ADM2_PCODE) ?? [];

    this._visitedDistrictIds.set(new Set(ids));
  }

  setDistrictsVisited(districtIds: readonly string[], visited: boolean): void {
    if (!this._hydrated()) {
      return;
    }

    const validIds = new Set(
      this.geoData.data()?.features.map((feature) => feature.properties.ADM2_PCODE) ?? [],
    );

    this._visitedDistrictIds.update((current) => {
      const updated = new Set(current);

      for (const id of districtIds) {
        if (!validIds.has(id)) {
          continue;
        }

        if (visited) {
          updated.add(id);
        } else {
          updated.delete(id);
        }
      }

      return updated;
    });
  }

  clearAll(): void {
    if (!this._hydrated()) {
      return;
    }

    this._visitedDistrictIds.set(new Set<string>());
  }

  private isValidDistrict(id: string): boolean {
    return (
      this.geoData.data()?.features.some((feature) => feature.properties.ADM2_PCODE === id) ?? false
    );
  }
}
