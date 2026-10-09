
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  DistrictGeoJsonService,
} from '../../../../core/services/district-geojson.service';

import {
  TravelStateService,
} from '../../../../core/services/travel-state.service';

import {
  DIVISION_NAMES,
} from '../../../../core/constants/divisions';

type VisitFilter = 'all' | 'visited' | 'unvisited';

@Component({
  selector: 'app-district-explorer',
  standalone: true,
  templateUrl: './district-explorer.html',
  styleUrl: './district-explorer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistrictExplorer {
  readonly geoData = inject(DistrictGeoJsonService);
  readonly travelState = inject(TravelStateService);

  readonly divisions = DIVISION_NAMES;

  // Search and filter state.
  readonly searchQuery = signal('');
  readonly selectedDivision = signal('all');
  readonly visitFilter = signal<VisitFilter>('all');

  // All valid districts from GeoJSON.
  readonly districts = computed(() => {
    const features = this.geoData.data()?.features ?? [];

    return features
      .map(feature => ({
        id: feature.properties.ADM2_PCODE,
        name: feature.properties.ADM2_EN,
        division: feature.properties.ADM1_EN,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Apply search, division and visited filters.
  readonly filteredDistricts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const division = this.selectedDivision();
    const status = this.visitFilter();
    const visited = this.travelState.visitedDistrictIds();

    return this.districts().filter(district => {
      const matchesSearch =
        district.name.toLowerCase().includes(query);

      const matchesDivision =
        division === 'all' ||
        district.division === division;

      const isVisited = visited.has(district.id);

      const matchesStatus =
        status === 'all' ||
        (status === 'visited' && isVisited) ||
        (status === 'unvisited' && !isVisited);

      return (
        matchesSearch &&
        matchesDivision &&
        matchesStatus
      );
    });
  });

  readonly filteredCount = computed(
    () => this.filteredDistricts().length
  );

  readonly selectedInFiltered = computed(() => {
    const visited = this.travelState.visitedDistrictIds();

    return this.filteredDistricts().filter(
      district => visited.has(district.id)
    ).length;
  });

  readonly allFilteredVisited = computed(
    () =>
      this.filteredCount() > 0 &&
      this.selectedInFiltered() === this.filteredCount()
  );

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().trim() !== '' ||
      this.selectedDivision() !== 'all' ||
      this.visitFilter() !== 'all'
  );

  toggleDistrict(id: string): void {
    this.travelState.toggleDistrict(id);
  }

  selectFiltered(): void {
    const ids = this.filteredDistricts().map(
      district => district.id
    );

    this.travelState.setDistrictsVisited(ids, true);
  }

  clearFiltered(): void {
    const ids = this.filteredDistricts().map(
      district => district.id
    );

    this.travelState.setDistrictsVisited(ids, false);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDivision.set('all');
    this.visitFilter.set('all');
  }
}
