import { IControl, Map as MapboxMap } from 'mapbox-gl';

export type MapboxTileSelectorOptions = {
  maxTile: number;
  zoomLevel: number;
};

export class TileControl implements IControl {
  private map?: MapboxMap;
  private maxTile: number;
  private zoomLevel: number;
  private controlContainer?: HTMLElement;

  /**
   *
   */
  constructor(options: MapboxTileSelectorOptions | undefined) {
    this.maxTile = options ? (options.maxTile ? options.maxTile : 750) : 750;
    this.zoomLevel = options ? (options.zoomLevel ? options.zoomLevel : 22) : 22;
  }

  public onAdd(map: MapboxMap): HTMLElement {
    this.map = map;
    this.controlContainer = this.createControlContainer();

    this.map.on('dragend', this.drawGrid);
    this.map.on('zoomend', this.drawGrid);

    return this.controlContainer;
  }

  public onRemove() {
    this.map = undefined;
  }

  private drawGrid() {
    if (!this.map) {
      throw Error('map is undefined');
    }

    console.log(this.map);
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
}
