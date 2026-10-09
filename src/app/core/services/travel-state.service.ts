
import {
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DistrictGeoJsonService } from
  './district-geojson.service';

import {
  DIVISION_NAMES,
} from '../constants/divisions';

@Injectable({
  providedIn: 'root',
})
export class TravelStateService {
  private readonly geoData = inject(DistrictGeoJsonService);

  private readonly _visitedDistrictIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly visitedDistrictIds = this._visitedDistrictIds.asReadonly();

  readonly totalDistricts = computed(() => this.geoData.districtCount());

  readonly visitedCount = computed(() => this._visitedDistrictIds().size);

  readonly remainingCount = computed(() =>
    Math.max(0, this.totalDistricts() - this.visitedCount()),
  );

  readonly progressPercentage = computed(() => {
    const total = this.totalDistricts();

    if (total === 0) {
      return 0;
    }

    return Math.round((this.visitedCount() / total) * 100);
  });

  readonly divisionProgress = computed(() => {
    const features = this.geoData.data()?.features ?? [];

    const selected = this._visitedDistrictIds();

    return DIVISION_NAMES.map((name) => {
      const districts = features.filter((feature) => feature.properties.ADM1_EN === name);

      const visited = districts.filter((feature) =>
        selected.has(feature.properties.ADM2_PCODE),
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

  isVisited(districtId: string): boolean {
    return this._visitedDistrictIds().has(districtId);
  }

  toggleDistrict(districtId: string): void {
    if (!this.isValidDistrict(districtId)) {
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
    const ids = this.geoData.data()?.features.map((feature) => feature.properties.ADM2_PCODE) ?? [];

    this._visitedDistrictIds.set(new Set(ids));
  }

  clearAll(): void {
    this._visitedDistrictIds.set(new Set<string>());
  }

  setDistrictsVisited(districtIds: readonly string[], visited: boolean): void {
    const validIds = new Set(
      this.geoData.data()?.features.map((feature) => feature.properties.ADM2_PCODE) ?? [],
    );

    const requestedIds = districtIds.filter((id) => validIds.has(id));

    if (requestedIds.length === 0) {
      return;
    }

    this._visitedDistrictIds.update((current) => {
      const updated = new Set(current);

      for (const id of requestedIds) {
        if (visited) {
          updated.add(id);
        } else {
          updated.delete(id);
        }
      }

      return updated;
    });
  }

  private isValidDistrict(id: string): boolean {
    return (
      this.geoData.data()?.features.some((feature) => feature.properties.ADM2_PCODE === id) ?? false
    );
  }
}
