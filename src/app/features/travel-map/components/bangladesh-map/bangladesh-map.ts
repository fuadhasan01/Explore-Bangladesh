
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import * as d3 from 'd3';

import { DistrictGeoJsonService } from
  '../../../../core/services/district-geojson.service';

import type {
  DistrictCollection,
  DistrictFeature,
  DistrictGeometry,
} from '../../../../core/models/district.model';

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

  private readonly mapSvg =
    viewChild<ElementRef<SVGSVGElement>>('mapSvg');

  // Temporary selection state for Phase 4.
  readonly selectedDistricts =
    signal<ReadonlySet<string>>(new Set<string>());

  readonly selectedCount = computed(
    () => this.selectedDistricts().size
  );

  readonly tooltip = signal<DistrictTooltip | null>(null);

  private hoveredDistrictId: string | null = null;

  private svgSelection:
    d3.Selection<SVGSVGElement, unknown, null, undefined>
    | null = null;

  private zoomBehavior:
    d3.ZoomBehavior<SVGSVGElement, unknown>
    | null = null;

  constructor() {
    void this.geoData.load();

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

  private renderMap(
    svgElement: SVGSVGElement,
    data: DistrictCollection
  ): void {
    const svg = d3.select(svgElement);

    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    this.svgSelection = svg;

    // Project real coordinates into our SVG.


const correctedData: DistrictCollection = {
  type: 'FeatureCollection',
  features: data.features.map(feature => ({
    ...feature,
    geometry: fixPolygonWinding(feature.geometry),
  })),
};

console.log(
  'Corrected GeoJSON bounds:',
  d3.geoBounds(correctedData)
);

const projection = d3.geoMercator()
  .fitExtent(
    [
      [MAP_PADDING, MAP_PADDING],
      [
        MAP_WIDTH - MAP_PADDING,
        MAP_HEIGHT - MAP_PADDING,
      ],
    ],
    correctedData
  );

const pathGenerator = d3.geoPath(projection);


console.log('GeoJSON bounds:', d3.geoBounds(data));
console.log('Projected bounds:', pathGenerator.bounds(data));


    // All district paths will sit inside this group.
    // Zooming transforms the group, not the SVG itself.
    const mapLayer = svg
      .append('g')
      .attr('class', 'district-layer');

    mapLayer
      .selectAll<SVGPathElement, DistrictFeature>(
        '.district-path'
      )
      .data(
        correctedData.features,
        district => district.properties.ADM2_PCODE
      )
      .join('path')
      .attr('class', 'district-path')
      .attr('data-district', district =>
        district.properties.ADM2_PCODE
      )
      .attr('d', district =>
        pathGenerator(district) ?? ''
      )
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
        this.hoveredDistrictId =
          district.properties.ADM2_PCODE;

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
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          this.toggleDistrict(district);
        }
      })

      .on('focus', (_event, district) => {
        this.hoveredDistrictId =
          district.properties.ADM2_PCODE;

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
      .on('zoom', event => {
        mapLayer.attr(
          'transform',
          event.transform.toString()
        );
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

  private showTooltip(
    event: PointerEvent,
    district: DistrictFeature
  ): void {
    const svgElement = this.mapSvg()?.nativeElement;

    if (!svgElement) {
      return;
    }

    const bounds = svgElement.getBoundingClientRect();

    const x = Math.max(
      8,
      Math.min(
        event.clientX - bounds.left + 14,
        bounds.width - 190
      )
    );

    const y = Math.max(
      8,
      Math.min(
        event.clientY - bounds.top + 14,
        bounds.height - 95
      )
    );

    const id = district.properties.ADM2_PCODE;

    this.tooltip.set({
      name: district.properties.ADM2_EN,
      division: district.properties.ADM1_EN,
      visited: this.selectedDistricts().has(id),
      x,
      y,
    });
  }

  toggleDistrict(district: DistrictFeature): void {
    const id = district.properties.ADM2_PCODE;

    this.selectedDistricts.update(current => {
      const updated = new Set(current);

      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }

      return updated;
    });

    this.tooltip.update(current =>
      current
        ? {
            ...current,
            visited: this.selectedDistricts().has(id),
          }
        : null
    );

    this.updateDistrictStyles();
  }

  clearSelection(): void {
    this.selectedDistricts.set(new Set<string>());
    this.tooltip.set(null);
    this.updateDistrictStyles();
  }

  private updateDistrictStyles(): void {
    if (!this.svgSelection) {
      return;
    }

    const selected = this.selectedDistricts();

    this.svgSelection
      .selectAll<SVGPathElement, DistrictFeature>(
        '.district-path'
      )
      .attr('fill', district => {
        const id = district.properties.ADM2_PCODE;

        if (id === this.hoveredDistrictId) {
          return HOVER_COLOR;
        }

        return selected.has(id)
          ? VISITED_COLOR
          : UNVISITED_COLOR;
      })
      .attr('stroke', district =>
        district.properties.ADM2_PCODE ===
        this.hoveredDistrictId
          ? '#047857'
          : '#FFFFFF'
      )
      .attr('stroke-width', district =>
        district.properties.ADM2_PCODE ===
        this.hoveredDistrictId
          ? 2.5
          : 1.2
      )
      .attr('aria-pressed', district =>
        String(
          selected.has(
            district.properties.ADM2_PCODE
          )
        )
      )
      .attr('aria-label', district => {
        const isSelected = selected.has(
          district.properties.ADM2_PCODE
        );

        return (
          `${district.properties.ADM2_EN}, ` +
          `${district.properties.ADM1_EN} division, ` +
          `${isSelected ? 'selected' : 'not selected'}`
        );
      });
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

    this.svgSelection
      .transition()
      .duration(250)
      .call(this.zoomBehavior.scaleBy, factor);
  }

  resetZoom(): void {
    if (!this.svgSelection || !this.zoomBehavior) {
      return;
    }

    this.svgSelection
      .transition()
      .duration(300)
      .call(
        this.zoomBehavior.transform,
        d3.zoomIdentity
      );
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
