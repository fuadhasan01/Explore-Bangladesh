
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import * as d3 from 'd3';

import { DistrictGeoJsonService } from '../../../../core/services/district-geojson.service';

import type {
  DistrictCollection,
  DistrictFeature,
  DistrictGeometry,
} from '../../../../core/models/district.model';
import { TravelStateService } from '../../../../core/services/travel-state.service';
import { prepareMapGeometry } from '../../../../core/utils/map-geometry.util';
import { ThemeService } from '../../../../core/services/theme.service';

const MAP_WIDTH = 760;
const MAP_HEIGHT = 840;

const MAP_PADDING = 36;

const UNVISITED_COLOR = '#DDE8E4';
const VISITED_COLOR = '#10B981';
const HOVER_COLOR = '#34D399';

interface DistrictTooltip {
  name: string;
  division: string;
  visited: boolean;
  x: number;
  y: number;
}

@Component({
  selector: 'app-bangladesh-map',
  standalone: true,
  templateUrl: './bangladesh-map.html',
  styleUrl: './bangladesh-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BangladeshMap {
  readonly geoData = inject(DistrictGeoJsonService);
  readonly travelState = inject(TravelStateService);
  private readonly mapSvg = viewChild<ElementRef<SVGSVGElement>>('mapSvg');
  readonly themeService = inject(ThemeService);
  readonly mobileInteractionEnabled = signal(false);

  // Temporary selection state for Phase 4.
  readonly selectedCount = this.travelState.visitedCount;

  readonly tooltip = signal<DistrictTooltip | null>(null);

  private hoveredDistrictId: string | null = null;

  private svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

  constructor() {
    void this.geoData.load();

    effect(() => {
      this.travelState.visitedDistrictIds();
      this.themeService.theme();

      untracked(() => {
        this.updateDistrictStyles();
      });
    });

    afterRenderEffect({
      write: (onCleanup) => {
        const svgElement = this.mapSvg()?.nativeElement;
        const data = this.geoData.data();

        if (!svgElement || !data) {
          return;
        }

        // D3 manages SVG nodes outside Angular's template.
        untracked(() => this.renderMap(svgElement, data));

        onCleanup(() => {
          const svg = d3.select(svgElement);

          svg.interrupt();
          svg.on('.zoom', null);
          svg.selectAll('*').remove();

          this.svgSelection = null;
          this.zoomBehavior = null;
        });
      },
    });
  }

  private renderMap(svgElement: SVGSVGElement, data: DistrictCollection): void {
    const svg = d3.select(svgElement);

    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    this.svgSelection = svg;

    // Project real coordinates into our SVG.

    const correctedData = prepareMapGeometry(data);

    console.log('Corrected GeoJSON bounds:', d3.geoBounds(correctedData));

    const projection = d3.geoMercator().fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
      ],
      correctedData,
    );

    const pathGenerator = d3.geoPath(projection);

    console.log('GeoJSON bounds:', d3.geoBounds(data));
    console.log('Projected bounds:', pathGenerator.bounds(data));

    // All district paths will sit inside this group.
    // Zooming transforms the group, not the SVG itself.
    const mapLayer = svg.append('g').attr('class', 'district-layer');

    mapLayer
      .selectAll<SVGPathElement, DistrictFeature>('.district-path')
      .data(correctedData.features, (district) => district.properties.ADM2_PCODE)
      .join('path')
      .attr('class', 'district-path')
      .attr('data-district', (district) => district.properties.ADM2_PCODE)
      .attr('d', (district) => pathGenerator(district) ?? '')
      .attr('fill', UNVISITED_COLOR)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.2)
      .attr('stroke-linejoin', 'round')
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('role', 'button')
      .attr('tabindex', 0)
      .style('cursor', 'pointer')

      // Mouse and pointer interactions.
      .on('pointerenter', (event, district) => {
        this.hoveredDistrictId = district.properties.ADM2_PCODE;

        this.showTooltip(event, district);
        this.updateDistrictStyles();
      })

      .on('pointermove', (event, district) => {
        this.showTooltip(event, district);
      })

      .on('pointerleave', () => {
        this.hoveredDistrictId = null;
        this.tooltip.set(null);
        this.updateDistrictStyles();
      })

      // Click or tap to toggle selection.
      .on('click', (_event, district) => {
        this.toggleDistrict(district);
      })

      // Keyboard accessibility.
      .on('keydown', (event: KeyboardEvent, district) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.toggleDistrict(district);
        }
      })

      .on('focus', (_event, district) => {
        this.hoveredDistrictId = district.properties.ADM2_PCODE;

        this.updateDistrictStyles();
      })

      .on('blur', () => {
        this.hoveredDistrictId = null;
        this.tooltip.set(null);
        this.updateDistrictStyles();
      });

    // D3 zoom and pan behavior.
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .extent([
        [0, 0],
        [MAP_WIDTH, MAP_HEIGHT],
      ])
      .translateExtent([
        [0, 0],
        [MAP_WIDTH, MAP_HEIGHT],
      ])
      .on('zoom', (event) => {
        mapLayer.attr('transform', event.transform.toString());
      });

    svg.call(zoomBehavior);

    // Double-click should select districts rather
    // than unexpectedly zoom the map.
    svg.on('dblclick.zoom', null);

    // Let normal wheel scrolling move the page.
    // Zoom using buttons or touch gestures instead.
    svg.on('wheel.zoom', null);

    this.zoomBehavior = zoomBehavior;

    this.updateDistrictStyles();
  }

  toggleMobileInteraction(): void {
    this.mobileInteractionEnabled.update((enabled) => !enabled);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private showTooltip(event: PointerEvent, district: DistrictFeature): void {
    const svgElement = this.mapSvg()?.nativeElement;

    if (!svgElement) {
      return;
    }

    const bounds = svgElement.getBoundingClientRect();

    const x = Math.max(8, Math.min(event.clientX - bounds.left + 14, bounds.width - 190));

    const y = Math.max(8, Math.min(event.clientY - bounds.top + 14, bounds.height - 95));

    const id = district.properties.ADM2_PCODE;

    this.tooltip.set({
      name: district.properties.ADM2_EN,
      division: district.properties.ADM1_EN,
      visited: this.travelState.isVisited(id),
      x,
      y,
    });
  }

  toggleDistrict(district: DistrictFeature): void {
    const id = district.properties.ADM2_PCODE;

    this.travelState.toggleDistrict(id);

    this.tooltip.update((current) =>
      current
        ? {
            ...current,
            visited: this.travelState.isVisited(id),
          }
        : null,
    );

    this.updateDistrictStyles();
  }

  clearSelection(): void {
    this.travelState.clearAll();
    this.tooltip.set(null);
    this.updateDistrictStyles();
  }

  private updateDistrictStyles(): void {
    if (!this.svgSelection) {
      return;
    }

    const selected = this.travelState.visitedDistrictIds();

    const paths = this.svgSelection.selectAll<SVGPathElement, DistrictFeature>('.district-path');

    // Accessibility attributes should update immediately.
    paths
      .attr('aria-pressed', (district) => {
        const id = district.properties.ADM2_PCODE;
        return String(selected.has(id));
      })
      .attr('aria-label', (district) => {
        const id = district.properties.ADM2_PCODE;
        const visited = selected.has(id);

        return (
          `${district.properties.ADM2_EN}, ` +
          `${district.properties.ADM1_EN} division, ` +
          `${visited ? 'visited' : 'not visited'}`
        );
      });

    const getFill = (district: DistrictFeature): string => {
      const id = district.properties.ADM2_PCODE;

      if (id === this.hoveredDistrictId) {
        return '#34D399';
      }

      return selected.has(id)
        ? '#10B981'
        : this.themeService.theme() === 'dark'
          ? '#385566'
          : '#DDE8E4';
    };

    const getStroke = (district: DistrictFeature): string =>
      district.properties.ADM2_PCODE === this.hoveredDistrictId
        ? '#047857'
        : this.themeService.theme() === 'dark'
          ? '#152238'
          : '#FFFFFF';

    // Cancel previous color animations so rapid clicks
    // cannot leave districts with stale colors.
    paths.interrupt('district-colors');

    if (this.prefersReducedMotion()) {
      paths
        .attr('fill', getFill)
        .attr('stroke', getStroke)
        .attr('stroke-width', (district) =>
          district.properties.ADM2_PCODE === this.hoveredDistrictId ? 2.5 : 1.2,
        );

      return;
    }

    paths
      .transition('district-colors')
      .duration(180)
      .ease(d3.easeCubicOut)
      .attr('fill', getFill)
      .attr('stroke', getStroke)
      .attr('stroke-width', (district) =>
        district.properties.ADM2_PCODE === this.hoveredDistrictId ? 2.5 : 1.2,
      );
  }

  zoomIn(): void {
    this.changeZoom(1.5);
  }

  zoomOut(): void {
    this.changeZoom(1 / 1.5);
  }

  private changeZoom(factor: number): void {
    if (!this.svgSelection || !this.zoomBehavior) {
      return;
    }

    this.svgSelection.transition().duration(250).call(this.zoomBehavior.scaleBy, factor);
  }

  resetZoom(): void {
    if (!this.svgSelection || !this.zoomBehavior) {
      return;
    }

    this.svgSelection.transition().duration(300).call(this.zoomBehavior.transform, d3.zoomIdentity);
  }
}

function fixPolygonWinding(
  geometry: DistrictGeometry
): DistrictGeometry {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(
        ring => [...ring].reverse()
      ),
    };
  }

  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map(
      polygon =>
        polygon.map(ring => [...ring].reverse())
    ),
  };
}
