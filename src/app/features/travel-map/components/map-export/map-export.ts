
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import * as d3 from 'd3';
import { toPng } from 'html-to-image';

import { DistrictGeoJsonService } from
  '../../../../core/services/district-geojson.service';

import { TravelStateService } from
  '../../../../core/services/travel-state.service';

import { prepareMapGeometry } from
  '../../../../core/utils/map-geometry.util';

const POSTER_WIDTH = 800;
const POSTER_HEIGHT = 1000;

interface ExportDistrictPath {
  id: string;
  d: string;
}

@Component({
  selector: 'app-map-export',
  standalone: true,
  templateUrl: './map-export.html',
  styleUrl: './map-export.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapExport {
  readonly geoData = inject(DistrictGeoJsonService);
  readonly travelState = inject(TravelStateService);

  private readonly exportDialog =
    viewChild<ElementRef<HTMLDialogElement>>(
      'exportDialog'
    );

  private readonly posterSvg =
    viewChild<ElementRef<SVGSVGElement>>('posterSvg');

  // Poster customization
  readonly posterTitle = signal(
    'My Bangladesh Travel Journey'
  );

  readonly backgroundColor = signal('#F8FAFC');
  readonly visitedColor = signal('#10B981');
  readonly unvisitedColor = signal('#DCE8E3');

  readonly showStatistics = signal(true);
  readonly showLegend = signal(true);
  readonly showBranding = signal(true);

  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);

  // Create one SVG path per district.
  readonly districtPaths = computed<
    ExportDistrictPath[]
  >(() => {
    const data = this.geoData.data();

    if (!data) {
      return [];
    }

    const corrected = prepareMapGeometry(data);

    const projection = d3.geoMercator()
      .fitExtent(
        [
          [90, 160],
          [710, 815],
        ],
        corrected
      );

    const path = d3.geoPath(projection);

    return corrected.features.map(feature => ({
      id: feature.properties.ADM2_PCODE,
      d: path(feature) ?? '',
    }));
  });

  readonly exportReady = computed(() =>
    this.geoData.data() !== null &&
    this.travelState.hydrated() &&
    this.districtPaths().length === 64 &&
    this.districtPaths().every(path => path.d.length > 0)
  );

  open(): void {
    this.exportError.set(null);
    this.exportDialog()?.nativeElement.showModal();
  }

  close(): void {
    if (this.exporting()) {
      return;
    }

    this.exportDialog()?.nativeElement.close();
  }

  resetAppearance(): void {
    this.posterTitle.set('My Bangladesh Travel Journey');
    this.backgroundColor.set('#F8FAFC');
    this.visitedColor.set('#10B981');
    this.unvisitedColor.set('#DCE8E3');
    this.showStatistics.set(true);
    this.showLegend.set(true);
    this.showBranding.set(true);
  }

  async downloadPng(): Promise<void> {
    const svg = this.posterSvg()?.nativeElement;

    if (!svg || !this.exportReady() || this.exporting()) {
      return;
    }

    this.exportError.set(null);
    this.exporting.set(true);

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const exportNode = svg as unknown as HTMLElement;

      const dataUrl = await toPng(exportNode, {
        pixelRatio: 2,
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        backgroundColor: this.backgroundColor(),
        cacheBust: true,
      });

      this.triggerDownload(
        dataUrl,
        'explore-bangladesh-travel-map.png'
      );
    } catch (error) {
      console.error('PNG export failed:', error);

      this.exportError.set(
        'PNG export failed. Please try again.'
      );
    } finally {
      this.exporting.set(false);
    }
  }

  downloadSvg(): void {
    const svg = this.posterSvg()?.nativeElement;

    if (!svg || !this.exportReady() || this.exporting()) {
      return;
    }

    this.exportError.set(null);
    this.exporting.set(true);

    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;

      clone.setAttribute(
        'xmlns',
        'http://www.w3.org/2000/svg'
      );

      clone.setAttribute(
        'width',
        String(POSTER_WIDTH)
      );

      clone.setAttribute(
        'height',
        String(POSTER_HEIGHT)
      );

      const content = new XMLSerializer()
        .serializeToString(clone);

      const blob = new Blob([content], {
        type: 'image/svg+xml;charset=utf-8',
      });

      const url = URL.createObjectURL(blob);

      this.triggerDownload(
        url,
        'explore-bangladesh-travel-map.svg'
      );

      // Release the temporary URL after the download starts.
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('SVG export failed:', error);

      this.exportError.set(
        'SVG export failed. Please try again.'
      );
    } finally {
      this.exporting.set(false);
    }
  }

  private triggerDownload(
    url: string,
    filename: string
  ): void {
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
