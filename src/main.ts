import * as mapboxgl from 'mapbox-gl';
import { TileControlOptions, TileControl } from './tile/tile-control';
import {
  MapboxStyleDefinition,
  MapboxStyleSwitcherControl,
} from 'mapbox-gl-style-switcher';
import './tile/tile-control.css';
import 'mapbox-gl-style-switcher/styles.css';

const map = new mapboxgl.Map({
  container: 'map', // container id
  accessToken:
    'pk.eyJ1IjoiY2hhbnV1dXUiLCJhIjoiY2xpeHpleTY1MGN2ODNxbzFxNnljcDZrayJ9.C9q5-JIBhEZN1MSsJuVrSA',
  style: 'mapbox://styles/mapbox/satellite-streets-v12', // stylesheet location
  center: [-0.195499, 51.52086], // starting position [lng, lat]
  zoom: 17, // starting zoom
});

const getTileControl = () => {
  const options: TileControlOptions = {
    map: {
      maxTile: 750,
      zoomLevel: 22,
      minZoom: 17,
    }
  };
  return new TileControl(options);
};

const getStyleSwitcher = () => {
  const switcherStyles: MapboxStyleDefinition[] = [
    {
      title: 'Satellite',
      uri: 'mapbox://styles/mapbox/satellite-streets-v12',
    },
    {
      title: 'Dark',
      uri: 'mapbox://styles/mapbox/dark-v9',
    },
    {
      title: 'Light',
      uri: 'mapbox://styles/mapbox/light-v9',
    },
    {
      title: 'Street',
      uri: 'mapbox://styles/mapbox/streets-v12',
    },
  ];
  const switcherOptions = {
    defaultStyle: 'Satellite',
    eventListeners: undefined,
  };
  return new MapboxStyleSwitcherControl(switcherStyles, switcherOptions);
};

map.addControl(getTileControl());
map.addControl(getStyleSwitcher());
