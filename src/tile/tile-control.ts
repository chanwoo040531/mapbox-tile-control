import {
  FillPaint,
  GeoJSONSource,
  IControl,
  Map as MapboxMap,
} from 'mapbox-gl';
import { getCoordinateListFromBounds } from './calculator';
import { FeatureCollection, Position } from 'geojson';

export type MapboxTileSelectorOptions = {
  maxTile: number;
  zoomLevel: number;
};

export type MapboxTileSelectorStyles = {
  gridLayer?: {
    paint: FillPaint;
  };
  selectLayer?: {
    paint: FillPaint;
  };
  selectedLayer?: {
    paint: FillPaint;
  };
  userLayer?: {
    paint: FillPaint;
  };
};

export class TileControl implements IControl {
  private static readonly DEFAULT_STYLES: MapboxTileSelectorStyles = {
    gridLayer: {
      paint: {
        'fill-color': 'black',
        'fill-outline-color': 'black',
        'fill-opacity': 0.2,
      }
    },
    selectLayer: {
      paint: {
        'fill-color': 'blue',
      }
    },
    selectedLayer: {
      paint: {
        'fill-color': 'red',
      }
    },
    userLayer: {
      paint: {
        'fill-color': 'yellow',
      }
    },
  };

  private map?: MapboxMap;
  private maxTile: number;
  private zoomLevel: number;
  private styles: MapboxTileSelectorStyles;

  private controlContainer?: HTMLElement;

  constructor(
    options?: MapboxTileSelectorOptions,
    styles?: MapboxTileSelectorStyles
  ) {
    this.styles = styles || TileControl.DEFAULT_STYLES;
    this.maxTile = options ? (options.maxTile ? options.maxTile : 750) : 750;
    this.zoomLevel = options
      ? options.zoomLevel
        ? options.zoomLevel
        : 22
      : 22;
  }

  public onAdd(map: MapboxMap): HTMLElement {
    this.map = map;
    this.controlContainer = this.createControlContainer();

    this.map.on('load', this.loadHandler.bind(this));
    this.map.on('dragend', this.drawGrid.bind(this));
    this.map.on('zoomend', this.drawGrid.bind(this));

    return this.controlContainer;
  }

  public onRemove() {
    this.map = undefined;
  }

  private createControlContainer(): HTMLElement {
    const _controlContainer = document.createElement('div');
    _controlContainer.className = 'tile-ctrl-menu';
    _controlContainer.textContent = `0/${this.maxTile} Tiles selected.`;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'tile-button-container';

    const detailButton = document.createElement('button');
    detailButton.className = 'tile-detail-button';
    detailButton.type = 'button';
    detailButton.innerText = 'DETAILS';
    buttonContainer.appendChild(detailButton);

    const clearButton = document.createElement('button');
    clearButton.className = 'tile-clear-button';
    clearButton.type = 'button';
    clearButton.innerText = 'CLEAR SELECTION';
    buttonContainer.appendChild(clearButton);

    _controlContainer.appendChild(buttonContainer);

    return _controlContainer;
  }

  private loadHandler() {
    if (!this.map) {
      throw Error('map is undefined');
    }

    this.map.addSource('grid-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    this.map.addLayer({
      id: 'grid-layer',
      type: 'fill',
      source: 'grid-source',
      paint: this.styles.gridLayer?.paint,
      minzoom: 17,
    });
  }

  private drawGrid() {
    if (!this.map) {
      throw Error('map is undefined');
    }

    const coordinates = getCoordinateListFromBounds(
      this.map.getBounds(),
      this.zoomLevel
    );
    const geoJson = this.convertCoordinateToGeoJson(
      coordinates
    ) as FeatureCollection;

    const gridSource = this.map.getSource('grid-source') as GeoJSONSource;
    gridSource.setData(geoJson);
  }

  private convertCoordinateToGeoJson = (coordinates: Position[][][]) => {
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
}
