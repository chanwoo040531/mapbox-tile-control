import * as tilebelt from '@mapbox/tilebelt';
import {
  FillPaint,
  GeoJSONSource,
  GeoJSONSourceRaw,
  IControl,
  LngLat,
  LngLatBounds,
  MapMouseEvent,
  Map as MapboxMap,
} from 'mapbox-gl';
import {
  getCoordinatesFromBounds,
  getFeatureCollectionFromBounds,
  getFeatureCollectionFromCoordinates,
} from './calculator';

import { FeatureCollection } from 'geojson';

export type TileEvent = {
  target: MapboxMap
}

export type TileMapOptions = {
  maxTile: number;
  zoomLevel: number;
  minZoom: number;
}

export type TileControlEvents = {
  onDrawGrid?: (event: TileEvent) => void;
  onTileDrawStart?: (event: TileEvent) => void;
  onTileDrawEnd?: (event: TileEvent) => void;
  onTileDrawing?: (event: TileEvent) => void;
}

export type TileControlOptions = {
  map?: TileMapOptions;
  events?: TileControlEvents;
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

type SelectedLngLatInfos = {
  startLngLat?: LngLat;
  lastLngLat?: LngLat;
};

type TileMouseEvent = {
  tileCount: number;
};

type CoordinatesInfo = {
  featureCollection: FeatureCollection | undefined;
  quadKeyList: string[] | undefined;
};

export class TileControl implements IControl {
  private static readonly DEFAULT_OPTIONS: TileMapOptions = {
    maxTile: 750,
    zoomLevel: 22,
    minZoom: 17,
  };

  private static readonly EMPTY_SOURCE: GeoJSONSourceRaw = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  };

  private static readonly DEFAULT_STYLES: MapboxTileSelectorStyles = {
    gridLayer: {
      paint: {
        'fill-color': 'black',
        'fill-outline-color': 'black',
        'fill-opacity': 0.2,
      },
    },
    selectLayer: {
      paint: {
        'fill-color': 'blue',
        'fill-opacity': 0.2,
      },
    },
    selectedLayer: {
      paint: {
        'fill-color': 'red',
        'fill-opacity': 0.2,
      },
    },
    userLayer: {
      paint: {
        'fill-color': 'yellow',
        'fill-opacity': 0.2,
      },
    },
  };

  public options: TileMapOptions;
  public styles: MapboxTileSelectorStyles;
  private map?: MapboxMap;
  private controlContainer?: HTMLElement;
  private events?: TileControlEvents;

  private boundMouseMoveToDrawHandler: (e: MapMouseEvent) => void;
  private fireTileChangedHandler?: (e: TileMouseEvent) => void;
  private boundClearSelectionHandler: () => void;

  private tileSelectionActivated: boolean = false;
  private lngLatInfo: SelectedLngLatInfos = {
    startLngLat: undefined,
    lastLngLat: undefined,
  };

  private currentSelectedTiles?: CoordinatesInfo = undefined;

  private selectedTiles: CoordinatesInfo = {
    featureCollection: undefined,
    quadKeyList: undefined,
  };

  constructor(
    options?: TileControlOptions,
    styles?: MapboxTileSelectorStyles
  ) {
    this.styles = styles || TileControl.DEFAULT_STYLES;
    this.options = options?.map || TileControl.DEFAULT_OPTIONS;
    this.events = options?.events || undefined;

    this.boundMouseMoveToDrawHandler = this.mouseMoveToDrawHandler.bind(this);
    this.boundClearSelectionHandler = this.clearSelectionHandler.bind(this);
  }

  public onAdd(map: MapboxMap): HTMLElement {
    this.map = map;
    this.controlContainer = this.createControlContainer();
    this.map.on('style.load', this.loadHandler.bind(this));
    this.map.on('dragend', this.drawGridHandler.bind(this));
    this.map.on('zoomend', this.drawGridHandler.bind(this));
    this.map.on('click', 'grid-layer', this.tileSelectHandler.bind(this));

    return this.controlContainer;
  }

  public onRemove() {
    if (this.map) {
      this.map.off('style.load', this.loadHandler.bind(this));
      this.map.off('dragend', this.drawGridHandler.bind(this));
      this.map.off('zoomend', this.drawGridHandler.bind(this));
      this.map.off('click', 'grid-layer', this.tileSelectHandler.bind(this));
    }
    this.fireTileChangedHandler = undefined;
    this.currentSelectedTiles = undefined;
    this.map = undefined;
  }

  public getDefaultPosition = () => 'top-right';

  private onTileChanged(event: (e: TileMouseEvent) => void) {
    this.fireTileChangedHandler = event.bind(this);
  }

  private createControlContainer(): HTMLElement {
    const _controlContainer = document.createElement('div');
    _controlContainer.classList.add('mapboxgl-ctrl');
    _controlContainer.classList.add('tile-ctrl-menu');

    const textContainer = document.createElement('div');
    textContainer.className = 'tile-text-container';
    textContainer.innerText = 'No Tiles Selected.';
    this.onTileChanged((e: TileMouseEvent) => {
      textContainer.innerText = e.tileCount
        ? `${e.tileCount}/${this.options.maxTile} Tiles Selected.`
        : 'No Tiles Selected.';
    });
    _controlContainer.appendChild(textContainer);

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
    clearButton.onclick = this.boundClearSelectionHandler;
    buttonContainer.appendChild(clearButton);

    _controlContainer.appendChild(buttonContainer);

    return _controlContainer;
  }

  private loadHandler() {
    if (!this.map) {
      throw Error('map is undefined');
    }

    const selectedTileSource: GeoJSONSourceRaw = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    };

    const selectedFeatureCollection = this.selectedTiles.featureCollection;

    if (selectedFeatureCollection) {
      selectedTileSource.data = selectedFeatureCollection;
    }

    this.map.addSource('grid-source', TileControl.EMPTY_SOURCE);
    this.map.addSource('select-source', TileControl.EMPTY_SOURCE);
    this.map.addSource('selected-source', selectedTileSource);

    this.map.addLayer({
      id: 'grid-layer',
      type: 'fill',
      source: 'grid-source',
      paint: this.styles.gridLayer?.paint,
      minzoom: this.options.minZoom,
    });

    this.map.addLayer(
      {
        id: 'select-layer',
        type: 'fill',
        source: 'select-source',
        paint: this.styles.selectLayer?.paint,
        minzoom: this.options.minZoom,
      },
      'grid-layer'
    );

    this.map.addLayer(
      {
        id: 'selected-layer',
        type: 'fill',
        source: 'selected-source',
        paint: this.styles.selectedLayer?.paint,
        minzoom: this.options.minZoom,
      },
      'grid-layer'
    );

    this.drawGridHandler();
  }

  private drawGridHandler() {
    if (!this.map) {
      throw Error('map is undefined');
    }
    if (this.map.getZoom() < 17) {
      return;
    }

    const featureCollection = getFeatureCollectionFromBounds(
      this.map.getBounds(),
      this.options.zoomLevel
    );

    this.events?.onDrawGrid?.call(this, { target: this.map });
    const gridSource = this.map.getSource('grid-source') as GeoJSONSource;
    gridSource.setData(featureCollection);
  }

  private tileSelectHandler(e: MapMouseEvent) {
    if (!this.map) {
      throw Error('map is undefined');
    }

    if (!this.tileSelectionActivated) {
      this.tileSelectionActivated = true;
      const lngLat = this.formatLngLat(e.lngLat as LngLat);
      this.lngLatInfo.startLngLat = lngLat;

      const tile = tilebelt.pointToTile(
        lngLat.lng,
        lngLat.lat,
        this.options.zoomLevel
      );
      const coordinates = tilebelt.tileToGeoJSON(tile).coordinates;
      const featureColleciton = getFeatureCollectionFromCoordinates([
        coordinates,
      ]);

      const selectLayer = this.map.getSource('select-source') as GeoJSONSource;
      selectLayer.setData(featureColleciton);

      this.events?.onTileDrawStart?.call(this, { target: this.map });
      this.map.on('mousemove', this.boundMouseMoveToDrawHandler);
    } else {
      this.tileSelectionActivated = false;
      this.lngLatInfo.startLngLat = undefined;
      this.events?.onTileDrawEnd?.call(this, { target: this.map });
      this.map.off('mousemove', this.boundMouseMoveToDrawHandler);
      this.appendSelectTilesToSelectedTiles();
    }
  }

  private mouseMoveToDrawHandler(e: MapMouseEvent) {
    if (!this.map) {
      throw Error('map is undefined');
    }

    const start = this.lngLatInfo.startLngLat as LngLat;
    const last = this.lngLatInfo.lastLngLat as LngLat;
    const current = this.formatLngLat(e.lngLat);

    if (last && last.lng === current.lng && last.lat === current.lat) {
      return;
    }
    this.lngLatInfo.lastLngLat = current;

    const minLng = Math.min(start.lng, current.lng);
    const minLat = Math.min(start.lat, current.lat);
    const maxLng = Math.max(start.lng, current.lng);
    const maxLat = Math.max(start.lat, current.lat);

    const bounds = new LngLatBounds([minLng, minLat, maxLng, maxLat]);
    const coordinates = getCoordinatesFromBounds(
      bounds,
      this.options.zoomLevel,
      (lngLat) => this.layerExistOn(lngLat, ['selected-layer'])
    );

    const haveSelectedQuadKeys = this.selectedTiles?.quadKeyList ?? [];

    const totalCount =
      coordinates.quadKeyList.length + haveSelectedQuadKeys.length;

    if (totalCount > this.options.maxTile) {
      return;
    }

    const selectLayer = this.map.getSource('select-source') as GeoJSONSource;
    selectLayer.setData(coordinates.featureCollection);

    this.currentSelectedTiles = coordinates;

    this.events?.onTileDrawing?.call(this, { target: this.map });
    this.fireTileChangedHandler?.call(this, {
      tileCount: coordinates.quadKeyList.length + haveSelectedQuadKeys.length,
    });
  }

  private layerExistOn(lngLat: LngLat, layers: string[]) {
    if (!this.map) {
      throw Error('map is undefined');
    }
    if (!layers) {
      return false;
    }
    const point = this.map.project(lngLat);
    const features = this.map.queryRenderedFeatures(point, {
      layers: layers,
    });
    return features.length > 0;
  }

  private formatLngLat(lngLat: LngLat) {
    const tile = tilebelt.pointToTile(
      lngLat.lng,
      lngLat.lat,
      this.options.zoomLevel
    );
    const bbox = tilebelt.tileToBBOX(tile);
    return new LngLat((bbox[2] + bbox[0]) / 2, (bbox[3] + bbox[1]) / 2);
  }

  private clearSelectionHandler() {
    if (!this.map) {
      throw Error('map is undefined');
    }

    this.selectedTiles.featureCollection = undefined;
    this.selectedTiles.quadKeyList = undefined;
    const selectedLayer = this.map.getSource(
      'selected-source'
    ) as GeoJSONSource;

    const featureCollection = TileControl.EMPTY_SOURCE
      .data as FeatureCollection;
    selectedLayer.setData(featureCollection);

    this.fireTileChangedHandler?.call(this, { tileCount: 0 });
  }

  private appendSelectTilesToSelectedTiles() {
    if (!this.map) {
      throw Error('map is undefined');
    }

    if (!this.currentSelectedTiles) {
      return;
    }

    const currentFeatureCollection = this.currentSelectedTiles
      .featureCollection as FeatureCollection;
    const currentQuadKeyList = this.currentSelectedTiles
      .quadKeyList as string[];

    if (
      this.selectedTiles.featureCollection &&
      this.selectedTiles.quadKeyList
    ) {
      this.selectedTiles.featureCollection.features.push(
        ...currentFeatureCollection.features
      );
      this.selectedTiles.quadKeyList.push(...currentQuadKeyList);
    } else {
      this.selectedTiles.featureCollection =
        this.currentSelectedTiles.featureCollection;
      this.selectedTiles.quadKeyList = this.currentSelectedTiles.quadKeyList;
    }

    this.currentSelectedTiles = undefined;

    const selectLayer = this.map.getSource('select-source') as GeoJSONSource;
    selectLayer.setData(TileControl.EMPTY_SOURCE.data as FeatureCollection);

    const selectedLayer = this.map.getSource(
      'selected-source'
    ) as GeoJSONSource;
    selectedLayer.setData(
      this.selectedTiles.featureCollection as FeatureCollection
    );
  }
}
