
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';

import { TravelStateService } from
  './travel-state.service';

import { DistrictGeoJsonService } from
  './district-geojson.service';

import type { DistrictCollection } from
  '../models/district.model';

const STORAGE_KEY = 'explore-bangladesh:travel:v1';

const mockData: DistrictCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        ADM2_PCODE: 'DHAKA',
        ADM2_EN: 'Dhaka',
        ADM1_EN: 'Dhaka',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [90, 23],
          [91, 23],
          [91, 24],
          [90, 23],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        ADM2_PCODE: 'GAZIPUR',
        ADM2_EN: 'Gazipur',
        ADM1_EN: 'Dhaka',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [90, 24],
          [91, 24],
          [91, 25],
          [90, 24],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        ADM2_PCODE: 'SYLHET',
        ADM2_EN: 'Sylhet',
        ADM1_EN: 'Sylhet',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [91, 24],
          [92, 24],
          [92, 25],
          [91, 24],
        ]],
      },
    },
  ],
};

describe('TravelStateService', () => {
  let service: TravelStateService;

  beforeEach(() => {
    localStorage.clear();

    const data = signal<DistrictCollection | null>(
      mockData
    );

    TestBed.configureTestingModule({
      providers: [
        TravelStateService,
        {
          provide: DistrictGeoJsonService,
          useValue: {
            data: data.asReadonly(),
            districtCount: () => data()?.features.length ?? 0,
          },
        },
      ],
    });

    service = TestBed.inject(TravelStateService);

    // Run the hydration effect.
    TestBed.tick();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('starts with zero visited districts', () => {
    expect(service.visitedCount()).toBe(0);
    expect(service.totalDistricts()).toBe(3);
    expect(service.remainingCount()).toBe(3);
    expect(service.hydrated()).toBe(true);
  });

  it('selects a district', () => {
    service.toggleDistrict('DHAKA');

    expect(service.isVisited('DHAKA')).toBe(true);
    expect(service.visitedCount()).toBe(1);
    expect(service.remainingCount()).toBe(2);
  });

  it('deselects an already visited district', () => {
    service.toggleDistrict('DHAKA');
    service.toggleDistrict('DHAKA');

    expect(service.isVisited('DHAKA')).toBe(false);
    expect(service.visitedCount()).toBe(0);
  });

  it('ignores unknown district IDs', () => {
    service.toggleDistrict('UNKNOWN');

    expect(service.visitedCount()).toBe(0);
  });

  it('does not duplicate districts', () => {
    service.setDistrictsVisited(
      ['DHAKA', 'DHAKA'],
      true
    );

    expect(service.visitedCount()).toBe(1);
  });

  it('selects all districts', () => {
    service.selectAll();

    expect(service.visitedCount()).toBe(3);
    expect(service.progressPercentage()).toBe(100);
  });

  it('clears all selected districts', () => {
    service.selectAll();
    service.clearAll();

    expect(service.visitedCount()).toBe(0);
    expect(service.remainingCount()).toBe(3);
  });

  it('calculates exploration percentage', () => {
    service.toggleDistrict('DHAKA');

    expect(service.progressPercentage()).toBe(33);

    service.toggleDistrict('GAZIPUR');

    expect(service.progressPercentage()).toBe(67);
  });

  it('calculates division progress', () => {
    service.toggleDistrict('DHAKA');

    const dhaka = service.divisionProgress().find(
      division => division.name === 'Dhaka'
    );

    expect(dhaka?.visited).toBe(1);
    expect(dhaka?.total).toBe(2);
    expect(dhaka?.percentage).toBe(50);
  });

  it('saves selected districts to localStorage', () => {
    service.toggleDistrict('DHAKA');

    TestBed.tick();

    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}'
    );

    expect(saved.version).toBe(1);
    expect(saved.visitedDistrictIds).toEqual(
      ['DHAKA']
    );
  });
});


describe('TravelStateService restoration', () => {
  function createService(): TravelStateService {
    const data = signal<DistrictCollection | null>(
      mockData
    );

    TestBed.configureTestingModule({
      providers: [
        TravelStateService,
        {
          provide: DistrictGeoJsonService,
          useValue: {
            data: data.asReadonly(),
            districtCount: () => 3,
          },
        },
      ],
    });

    const service = TestBed.inject(
      TravelStateService
    );

    TestBed.tick();
    return service;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('restores valid saved district IDs', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        visitedDistrictIds: ['DHAKA', 'SYLHET'],
      })
    );

    const service = createService();

    expect(service.visitedCount()).toBe(2);
    expect(service.isVisited('DHAKA')).toBe(true);
    expect(service.isVisited('SYLHET')).toBe(true);
  });

  it('ignores unknown and duplicate saved IDs', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        visitedDistrictIds: [
          'DHAKA',
          'DHAKA',
          'UNKNOWN',
        ],
      })
    );

    const service = createService();

    expect(service.visitedCount()).toBe(1);
  });

  it('handles corrupted JSON safely', () => {
    localStorage.setItem(
      STORAGE_KEY,
      '{invalid json'
    );

    const service = createService();

    expect(service.hydrated()).toBe(true);
    expect(service.visitedCount()).toBe(0);
  });

  it('ignores unsupported storage versions', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 999,
        visitedDistrictIds: ['DHAKA'],
      })
    );

    const service = createService();

    expect(service.visitedCount()).toBe(0);
  });
});
