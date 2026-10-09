
import type {
  DistrictCollection,
  DistrictGeometry,
} from '../models/district.model';

export function fixPolygonWinding(
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

export function prepareMapGeometry(
  data: DistrictCollection
): DistrictCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.map(feature => ({
      ...feature,
      geometry: fixPolygonWinding(feature.geometry),
    })),
  };
}
