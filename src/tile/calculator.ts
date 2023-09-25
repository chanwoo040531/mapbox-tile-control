import { LngLatBounds } from 'mapbox-gl';
import tilebelt from '@mapbox/tilebelt';
import { FeatureCollection, Position } from 'geojson';

export const getFeatureCollectionFromBounds = (
  bounds: LngLatBounds,
  zoomLevel: number
) => {
  const coordinates = getCoordinateListFromBounds(bounds, zoomLevel);
  const featureCollection = getFeatureCollectionFromCoordinates(coordinates);
  return featureCollection as FeatureCollection;
};

export const getCoordinateListFromBoundss = (
  bounds: LngLatBounds,
  zoomLevel: number
) => {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  return getFeatureCollectionFromCoordinates([
    [
      [
        [sw.lng, sw.lat],
        [ne.lng, sw.lat],
        [ne.lng, ne.lat],
        [sw.lng, ne.lat],
        [sw.lng, sw.lat],
      ],
    ],
  ]) as FeatureCollection;
};

export const getCoordinateListFromBounds = (
  bounds: LngLatBounds,
  zoomLevel: number
) => {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const tile = tilebelt.pointToTile(ne.lng, ne.lat, zoomLevel);
  const bbox = tilebelt.tileToBBOX(tile);

  const offset = [bbox[2] - bbox[0], bbox[3] - bbox[1]]; // Tile 한변의 길이 구하는 부분

  const coordinateList = [];

  for (let i = sw.lng - offset[0]; i <= ne.lng + offset[0]; i += offset[0]) {
    for (let j = sw.lat - offset[1]; j <= ne.lat + offset[1]; j += offset[1]) {
      const currentTile = tilebelt.pointToTile(i, j, zoomLevel);
      const currentGeoJson = tilebelt.tileToGeoJSON(currentTile);
      coordinateList.push(currentGeoJson.coordinates);
    }
  }
  return coordinateList;
};

export const getFeatureCollectionFromCoordinates = (
  coordinates: Position[][][]
) => {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: coordinates,
        },
      },
    ],
  };
};
