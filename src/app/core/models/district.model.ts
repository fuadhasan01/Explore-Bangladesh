
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from 'geojson';

export interface DistrictProperties {
  ADM2_EN: string;      // District name
  ADM2_PCODE: string;   // Stable district code
  ADM1_EN: string;      // Division name
  ADM1_PCODE?: string;  // Division code
}

export type DistrictGeometry =
  | Polygon
  | MultiPolygon;

export type DistrictFeature = Feature<
  DistrictGeometry,
  DistrictProperties
>;

export type DistrictCollection = FeatureCollection<
  DistrictGeometry,
  DistrictProperties
>;

export interface DivisionSummary {
  name: string;
  totalDistricts: number;
}
