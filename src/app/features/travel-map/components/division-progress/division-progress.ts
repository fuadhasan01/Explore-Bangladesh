
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';

import { TravelStateService } from
  '../../../../core/services/travel-state.service';

import { DistrictGeoJsonService } from
  '../../../../core/services/district-geojson.service';

@Component({
  selector: 'app-division-progress',
  standalone: true,
  templateUrl: './division-progress.html',
  styleUrl: './division-progress.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DivisionProgress {
  readonly travelState = inject(TravelStateService);
  readonly geoData = inject(DistrictGeoJsonService);

  private readonly clearDialog =
    viewChild<ElementRef<HTMLDialogElement>>('clearDialog');

  readonly completedDivisions = computed(() =>
    this.travelState.divisionProgress().filter(
      division =>
        division.total > 0 &&
        division.visited === division.total
    ).length
  );

  readonly startedDivisions = computed(() =>
    this.travelState.divisionProgress().filter(
      division => division.visited > 0
    ).length
  );

  readonly hasVisitedDistricts = computed(
    () => this.travelState.visitedCount() > 0
  );

  completeDivision(divisionName: string): void {
    const ids =
      this.geoData.data()?.features
        .filter(
          feature =>
            feature.properties.ADM1_EN === divisionName
        )
        .map(
          feature => feature.properties.ADM2_PCODE
        ) ?? [];

    this.travelState.setDistrictsVisited(ids, true);
  }

  openClearConfirmation(): void {
    if (!this.hasVisitedDistricts()) {
      return;
    }

    this.clearDialog()?.nativeElement.showModal();
  }

  cancelClear(): void {
    this.clearDialog()?.nativeElement.close();
  }

  confirmClear(): void {
    this.travelState.clearAll();
    this.clearDialog()?.nativeElement.close();
  }
}
