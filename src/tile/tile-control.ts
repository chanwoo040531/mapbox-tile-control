import mapboxgl, {
  FillPaint,
  GeoJSONSource,
  IControl,
  MapMouseEvent,
  Map as MapboxMap,
  Point,
  GeoJSONSourceRaw,
  LngLatBounds,
  LngLat,
  LngLatBoundsLike,
  LngLatLike,
} from 'mapbox-gl';
import {
  getCoordinateListFromBounds,
  getCoordinateListFromBoundss,
  getFeatureCollectionFromBounds,
} from './calculator';
import tilebelt from '@mapbox/tilebelt';

export type MapboxTileSelectorOptions = {
  maxTile: number;
  zoomLevel: number;
  minZoom: number;
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

export type GridLoadEvent = {
  target: MapboxMap;
};

type SelectTileInfos = {
  startLngLat?: LngLatLike;
  quadKeys?: string[];
};

type TileMouseEvent = {
  tileCount: number;
};

export class TileControl implements IControl {
  private static readonly DEFAULT_OPTIONS: MapboxTileSelectorOptions = {
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
        'fill-outline-color': ['case', ['get', 'layer']],
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
      },
    },
    userLayer: {
      paint: {
        'fill-color': 'yellow',
      },
    },
  };

  public options: MapboxTileSelectorOptions;
  public styles: MapboxTileSelectorStyles;
  private map?: MapboxMap;
  private controlContainer?: HTMLElement;

  private boundMouseMoveToDrawHandler: (e: MapMouseEvent) => void;
  private fireMouseMoveHandler?: (e: TileMouseEvent) => void;
  private fireGridLoadHandler?: (e: GridLoadEvent) => void;

  private tileSelectionActivated: boolean = false;
  private tileInfo: SelectTileInfos = {
    quadKeys: undefined,
    startLngLat: undefined,
  };

  constructor(
    options?: MapboxTileSelectorOptions,
    styles?: MapboxTileSelectorStyles
  ) {
    this.styles = styles || TileControl.DEFAULT_STYLES;
    this.options = options || TileControl.DEFAULT_OPTIONS;

    this.boundMouseMoveToDrawHandler = this.mouseMoveToDrawHandler.bind(this);
  }

  public onAdd(map: MapboxMap): HTMLElement {
    this.map = map;
    this.controlContainer = this.createControlContainer();

    this.map.on('load', this.loadHandler.bind(this));
    this.map.on('dragend', this.drawGridHandler.bind(this));
    this.map.on('zoomend', this.drawGridHandler.bind(this));
    this.map.on('click', 'grid-layer', this.tileSelectHandler.bind(this));
    
    return this.controlContainer;
  }
  
  public onRemove() {
    console.log('remove');
    this.map = undefined;
  }

  public onGridLoad(event: (e: GridLoadEvent) => void) {
    const boundEvent = event.bind(this);
    this.fireGridLoadHandler = boundEvent;
  }

  private onMouseMove(event: (e: TileMouseEvent) => void) {
    const boundEvent = event.bind(this);
    this.fireMouseMoveHandler = boundEvent;
  }

  private createControlContainer(): HTMLElement {
    const _controlContainer = document.createElement('div');
    _controlContainer.className = 'tile-ctrl-menu';

    const textContainer = document.createElement('div');
    textContainer.className = 'tile-text-container';
    textContainer.innerText = `No Tiles Selected.`;
    this.onMouseMove((e: TileMouseEvent) => {
      textContainer.innerText = e.tileCount
        ? `${e.tileCount}/${this.options.maxTile} Tiles Selected.`
        : `No Tiles Selected.`;
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
    buttonContainer.appendChild(clearButton);

    _controlContainer.appendChild(buttonContainer);

    return _controlContainer;
  }

  private loadHandler() {
    if (!this.map) {
      throw Error('map is undefined');
    }

    this.map.addSource('grid-source', TileControl.EMPTY_SOURCE);
    this.map.addSource('select-source', TileControl.EMPTY_SOURCE);

    this.map.addLayer({
      id: 'grid-layer',
      type: 'fill',
      source: 'grid-source',
      paint: this.styles.gridLayer?.paint,
      minzoom: this.options.minZoom,
    });

    this.map.addLayer({
      id: 'select-layer',
      type: 'fill',
      source: 'select-source',
      paint: this.styles.selectLayer?.paint,
      minzoom: this.options.minZoom,
    });
  }

  private drawGridHandler() {
    if (!this.map) {
      throw Error('map is undefined');
    }
    if (this.fireGridLoadHandler) {
      this.fireGridLoadHandler({ map: this.map });
    }

    const featureCollection = getFeatureCollectionFromBounds(
      this.map.getBounds(),
      this.options.zoomLevel
    );

    const gridSource = this.map.getSource('grid-source') as GeoJSONSource;
    gridSource.setData(featureCollection);
  }

  private tileSelectHandler(e: MapMouseEvent) {
    if (!this.map) {
      throw Error('map is undefined');
    }

    if (!this.tileSelectionActivated) {
      this.tileSelectionActivated = true;
      this.tileInfo.startLngLat = e.lngLat;

      this.map.on('mousemove', this.boundMouseMoveToDrawHandler);
    } else {
      this.tileSelectionActivated = false;
      this.tileInfo.startLngLat = undefined;
      this.appendSelectTilesToSelectedTiles();
      this.map.off('mousemove', this.boundMouseMoveToDrawHandler);
    }
  }

  private mouseMoveToDrawHandler(e: MapMouseEvent) {
    if (!this.map) {
      throw Error('map is undefined');
    }

    const start = this.lngLatToBbox(this.tileInfo.startLngLat as LngLat);
    const current = this.lngLatToBbox(e.lngLat);

    const minLngLat: LngLatLike = [
      Math.min(start[2], current[0]),
      Math.min(start[3], current[1]),
    ];

    const maxLngLat: LngLatLike = [
      Math.max(start[2], current[0]),
      Math.max(start[3], current[1]),
    ];

    const bounds = new LngLatBounds([minLngLat, maxLngLat]);
    const featureCollection = getCoordinateListFromBoundss(
      bounds,
      this.options.zoomLevel
    );

    const selectLayer = this.map.getSource('select-source') as GeoJSONSource;
    selectLayer.setData(featureCollection);

    if (this.fireMouseMoveHandler) {
      this.fireMouseMoveHandler({ tileCount: 10 });
    }
  }

  private lngLatToBbox(lngLat: LngLat) {
    const tile = tilebelt.pointToTile(
      lngLat.lng,
      lngLat.lat,
      this.options.zoomLevel
    );
    return tilebelt.tileToBBOX(tile);
  }

  // private formatLngLat(lngLat: LngLat) {
  //   const tile = tilebelt.pointToTile(
  //     lngLat.lng,
  //     lngLat.lat,
  //     this.options.zoomLevel
  //   );
  //   const bbox = tilebelt.tileToBBOX(tile);
  //   return new mapboxgl.LngLat(
  //     (bbox[2] + bbox[0]) / 2,
  //     (bbox[3] + bbox[1]) / 2
  //   );
  // }

  private appendSelectTilesToSelectedTiles() {}
}
