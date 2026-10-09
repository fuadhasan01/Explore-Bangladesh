
import {
  Injectable,
  computed,
  signal,
} from '@angular/core';

import {
  DIVISION_DISTRICT_COUNTS,
  DIVISION_NAMES,
  normalizeDistrictName,
  normalizeDivisionName,
  type DivisionName,
} from '../constants/divisions';

import type {
  DistrictCollection,
  DistrictFeature,
  DistrictGeometry,
  DistrictProperties,
  DivisionSummary,
} from '../models/district.model';

const DATA_URL =
  '/assets/geojson/bangladesh-districts.geojson';

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

@Injectable({
  providedIn: 'root',
})
export class DistrictGeoJsonService {
  private readonly _data =
    signal<DistrictCollection | null>(null);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly districtCount = computed(
    () => this.data()?.features.length ?? 0
  );

  readonly divisionSummary = computed<DivisionSummary[]>(
    () => {
      const features = this.data()?.features ?? [];

      return DIVISION_NAMES.map(name => ({
        name,
        totalDistricts: features.filter(
          feature =>
            feature.properties.ADM1_EN === name
        ).length,
      }));
    }
  );

  async load(): Promise<void> {
    if (this._loading() || this._data()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(DATA_URL);

      if (!response.ok) {
        throw new Error(
          `Could not load GeoJSON (HTTP ${response.status}).`
        );
      }

      const rawData: unknown = await response.json();

      const validatedData = this.validate(rawData);

      this._data.set(validatedData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred.';

      this._error.set(message);
      console.error('GeoJSON loading failed:', error);
    } finally {
      this._loading.set(false);
    }
  }

  private validate(input: unknown): DistrictCollection {
    if (
      !isRecord(input) ||
      input['type'] !== 'FeatureCollection' ||
      !Array.isArray(input['features'])
    ) {
      throw new Error(
        'Invalid GeoJSON: expected a FeatureCollection.'
      );
    }

    const rawFeatures: unknown[] = input['features'];

    if (rawFeatures.length !== 64) {
      throw new Error(
        `Expected 64 districts, found ${rawFeatures.length}.`
      );
    }

    const features: DistrictFeature[] =
      rawFeatures.map((value, index) => {
        if (
          !isRecord(value) ||
          value['type'] !== 'Feature' ||
          !isRecord(value['properties']) ||
          !isRecord(value['geometry'])
        ) {
          throw new Error(
            `Invalid GeoJSON feature at index ${index}.`
          );
        }

        const properties = value['properties'];
        const geometry = value['geometry'];

        const id = properties['ADM2_PCODE'];
        const name = properties['ADM2_EN'];
        const division = properties['ADM1_EN'];

        if (
          typeof id !== 'string' ||
          !id.trim() ||
          typeof name !== 'string' ||
          !name.trim() ||
          typeof division !== 'string' ||
          !division.trim()
        ) {
          throw new Error(
            `District ${index + 1} has missing or invalid properties.`
          );
        }

        
        if (!isDistrictGeometry(geometry)) {
        throw new Error(
            `Invalid district geometry: ${name}.`
        );
        }


        const normalizedProperties: DistrictProperties = {
          ADM2_PCODE: id.trim(),
          ADM2_EN: normalizeDistrictName(name),
          ADM1_EN: normalizeDivisionName(division),
          ...(typeof properties['ADM1_PCODE'] === 'string'
            ? { ADM1_PCODE: properties['ADM1_PCODE'] }
            : {}),
        };

        return {
          type: 'Feature',
          id: normalizedProperties.ADM2_PCODE,
          properties: normalizedProperties,
          geometry: geometry,
        };
      });

    this.validateIdentifiers(features);
    this.validateDivisions(features);

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  private validateIdentifiers(
    features: DistrictFeature[]
  ): void {
    const ids = features.map(
      feature => feature.properties.ADM2_PCODE
    );

    const names = features.map(
      feature =>
        feature.properties.ADM2_EN.toLowerCase()
    );

    if (new Set(ids).size !== 64) {
      throw new Error(
        'GeoJSON contains duplicate district identifiers.'
      );
    }

    if (new Set(names).size !== 64) {
      throw new Error(
        'GeoJSON contains duplicate district names.'
      );
    }
  }

  private validateDivisions(
    features: DistrictFeature[]
  ): void {
    for (const division of DIVISION_NAMES) {
      const actualCount = features.filter(
        feature =>
          feature.properties.ADM1_EN === division
      ).length;

      const expectedCount =
        DIVISION_DISTRICT_COUNTS[division];

      if (actualCount !== expectedCount) {
        throw new Error(
          `${division}: expected ${expectedCount} districts, ` +
          `found ${actualCount}.`
        );
      }
    }

    const knownDivisions = new Set<string>(
      DIVISION_NAMES
    );

    for (const feature of features) {
      const division = feature.properties.ADM1_EN;

      if (!knownDivisions.has(division)) {
        throw new Error(
          `Unknown division: ${division}.`
        );
      }
    }
  }
}


function isDistrictGeometry(
  value: unknown
): value is DistrictGeometry {
  if (!isRecord(value)) {
    return false;
  }

  const type = value['type'];
  const coordinates = value['coordinates'];

  return (
    (type === 'Polygon' || type === 'MultiPolygon') &&
    Array.isArray(coordinates) &&
    coordinates.length > 0
  );
}

