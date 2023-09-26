import * as tilebelt from '@mapbox/tilebelt';
import { FeatureCollection, Position } from 'geojson';
import { LngLat, LngLatBounds } from 'mapbox-gl';

export const getFeatureCollectionFromBounds = (
  bounds: LngLatBounds,
  zoomLevel: number
) => {
  const coordinates = getCoordinateListFromBounds(bounds, zoomLevel);
  const featureCollection = getFeatureCollectionFromCoordinates(coordinates);
  return featureCollection as FeatureCollection;
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

  for (let i = sw.lng; i < ne.lng + offset[0]; i += offset[0]) {
    for (let j = sw.lat; j < ne.lat; j += offset[1]) {
      const currentTile = tilebelt.pointToTile(i, j, zoomLevel);
      const currentGeoJson = tilebelt.tileToGeoJSON(currentTile);
      coordinateList.push(currentGeoJson.coordinates);
    }
  }
  return coordinateList;
};

export const getCoordinatesFromBounds = (
  bounds: LngLatBounds,
  zoomLevel: number,
  predicate?: (lngLat: LngLat) => boolean
) => {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const tile = tilebelt.pointToTile(ne.lng, ne.lat, zoomLevel);
  const bbox = tilebelt.tileToBBOX(tile);
  const offsetX = bbox[2] - bbox[0];
  const offsetY = bbox[3] - bbox[1];

  const coordinateList: Position[][][] = [];
  const quadKeyList: string[] = [];

  for (let x = sw.lng; x <= ne.lng; x += offsetX) {
    for (let y = sw.lat; y <= ne.lat; y += offsetY) {
      const tile = tilebelt.pointToTile(x, y, zoomLevel);
      if (predicate && predicate(new LngLat(x, y))) {
        continue;
      }
      const coordinates = tilebelt.tileToGeoJSON(tile).coordinates;
      const quadKey = tilebelt.tileToQuadkey(tile);
      coordinateList.push(coordinates);
      quadKeyList.push(quadKey);
    }
  }

  const featureCollection = getFeatureCollectionFromCoordinates(coordinateList);

  return {
    featureCollection: featureCollection,
    quadKeyList: quadKeyList,
  };
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
  } as FeatureCollection;
};
