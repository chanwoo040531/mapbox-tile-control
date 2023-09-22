import mapboxgl from 'mapbox-gl';
import { TileControl } from './tile/tile-control';
import './tile/tile-control.css';

const map = new mapboxgl.Map({
  container: 'map', // container id
  accessToken:
    'pk.eyJ1IjoiY2hhbnV1dXUiLCJhIjoiY2xpeHpleTY1MGN2ODNxbzFxNnljcDZrayJ9.C9q5-JIBhEZN1MSsJuVrSA',
  style: 'mapbox://styles/mapbox/streets-v9', // stylesheet location
  center: [-0.195499, 51.52086], // starting position [lng, lat]
  zoom: 15, // starting zoom
});

map.addControl(new TileControl({ maxTile: 50, zoomLevel: 50 }));
