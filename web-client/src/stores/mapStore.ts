import { defineStore } from 'pinia';
import { Map as OLMap } from 'ol';
import ol_control_WMSCapabilities from 'ol-ext/control/WMSCapabilities';
import ol_control_WMTSCapabilities from 'ol-ext/control/WMTSCapabilities';
import { usePermalink } from '@/composables/usePermalink';
import { Graticule } from 'ol';
import { Stroke } from 'ol/style';
import { type Coordinate } from "ol/coordinate";
import { type Layer as OL_Layer_Type} from 'ol/layer';
import { Source } from 'ol/source';
import LayerRenderer   from 'ol/renderer/Layer';
//import { fetchAndUpdateElevationData } from '@/utils/SrMapUtils';

export type TimeoutHandle = ReturnType<typeof setTimeout>;

export const useMapStore = defineStore('map', {
  state: () => ({
    map: null as OLMap | null,
    wmsCapCache: new Map(), // a javascript Map object
    currentWmsCapProjectionName: 'EPSG:3857' as string,
    wmtsCapCache: new Map(), // a javascript Map object
    currentWmtsCapProjectionName: 'EPSG:3857' as string,
    plink: usePermalink(),
    graticuleState: false,
    graticule : new Graticule({
        // Style options go here
        strokeStyle: new Stroke({
            color: 'rgba(255,120,0,0.9)',
            width: 1,
            lineDash: [0.5, 4]
        }),
        showLabels: true,
        wrapX: false
    }),
    polygonSource:{name:'Draw on Map',value:'Draw on Map'},
    polyCoords: <Coordinate[][]>([]),
    //theDeckLayer: null as OL_Layer | null,
    dLayers: [] as OL_Layer_Type<Source, LayerRenderer<any>>[],
    isLoading: false,
    isAborting: false,
    currentReqId: 0 as number,
    redrawTimeOutSeconds: 5,
    reDrawElevationsTimeoutHandle: null as TimeoutHandle | null // Handle for the timeout to clear it when necessary
  }),
  actions: {
    setMap(mapInstance: OLMap) {
      this.map = mapInstance;
    },
    getMap() {
      return this.map;
    },
    setCurrentWmsCap(projectionName: string) {
      const wmsCap = this.getWmsCapFromCache(projectionName);
      this.map?.addControl(wmsCap);
      this.currentWmsCapProjectionName = projectionName;
    },
    // WMS Capabilities
    getWmsCapFromCache(projectionName:string) : ol_control_WMSCapabilities {
      return this.wmsCapCache.get(projectionName);
    },
    cacheWmsCapForProjection(projectionName:string, wmsCapInstance: ol_control_WMSCapabilities) {
      //console.log('cacheWmsCapForProjection:', projectionName);
      this.wmsCapCache.set(projectionName, wmsCapInstance);
    },
    updateWmsCap(projectionName: string)  {
      console.log('updateWmsCap:', projectionName);
      const currentWmsCapCntrl = this.getWmsCapFromCache(this.currentWmsCapProjectionName );
      if(currentWmsCapCntrl){
        this.map?.removeControl(currentWmsCapCntrl);
      } else {
        console.log(`currentWmsCapCntrl for '${this.currentWmsCapProjectionName}' not found in cache`);
      }
      this.setCurrentWmsCap(projectionName);
    },
    // WMTS Capabilities
    setCurrentWmtsCap(projectionName: string) {
      const wmtsCap = this.getWmtsCapFromCache(projectionName);
      console.log('setCurrentWmtsCap:', projectionName, wmtsCap);
      if(this.map){
        console.log('adding wmtsCap to map:', wmtsCap);
        this.map?.addControl(wmtsCap);
        this.currentWmtsCapProjectionName = projectionName;
      }
    },
    getWmtsCapFromCache(projectionName:string) : ol_control_WMTSCapabilities {
      return this.wmtsCapCache.get(projectionName);
    },
    cacheWmtsCapForProjection(projectionName:string, wmtsCapInstance: ol_control_WMTSCapabilities) {
      console.log('cacheWmtsCapForProjection:', projectionName);
      this.wmtsCapCache.set(projectionName, wmtsCapInstance);
    },
    updateWmtsCap(projectionName: string)  {
      console.log('updateWmtsCap:', projectionName);
      const currentWmtsCapCntrl = this.getWmtsCapFromCache(this.currentWmtsCapProjectionName );
      if(currentWmtsCapCntrl){
        this.map?.removeControl(currentWmtsCapCntrl);
      } else {
        console.log(`currentWmtsCapCntrl for '${this.currentWmtsCapProjectionName}' not found in cache`);
      }
      this.setCurrentWmtsCap(projectionName);
    },
    toggleGraticule() {
      this.graticuleState = !this.graticuleState;
      this.setGraticuleForMap();
    },
    setGraticuleForMap() {
      if (this.graticuleState) {
        const thisMap = this.map as OLMap;
        if(thisMap){
          this.graticule.setMap(thisMap);
        }
      } else {
          this.graticule.setMap(null);
      }
    },


    // setDeckLayer(layer:OL_Layer) {
    //   this.theDeckLayer = layer;
    // },
    // getDeckLayer() : OL_Layer | null {
    //   return this.theDeckLayer as OL_Layer | null;
    // }, 
    addDeckLayer(layer:OL_Layer_Type<Source, LayerRenderer<any>>) {
      this.dLayers.push(layer as OL_Layer_Type<Source, LayerRenderer<any>>);
    },
    getDeckLayers():  OL_Layer_Type<Source, LayerRenderer<any>>[]{
      return this.dLayers as OL_Layer_Type<Source, LayerRenderer<any>>[];
    },
    getCurrentReqId() {
      return this.currentReqId;
    },
    setCurrentReqId(reqId: number) {
      this.currentReqId = reqId;
    },
    setRedrawElevationsTimeoutHandle(handle: TimeoutHandle) {
      this.reDrawElevationsTimeoutHandle = handle;
    },
    clearRedrawElevationsTimeoutHandle() {
      if (this.reDrawElevationsTimeoutHandle) {
        clearTimeout(this.reDrawElevationsTimeoutHandle);
        this.reDrawElevationsTimeoutHandle = null;
      }
    },
    getRedrawElevationsTimeoutHandle() {
      return this.reDrawElevationsTimeoutHandle;
    },
    getIsLoading() {
      return this.isLoading;
    },
    setIsLoading() {
      this.isLoading = true;
    },
    resetIsLoading() {
      this.isLoading = false;
    },
    // async drawElevations() {
    //   if (this.isLoading && !this.isAborting) {
    //       await fetchAndUpdateElevationData(this.getCurrentReqId());
    //   } else {
    //       console.log('drawElevations: SKIPPED - not loading or aborting');
    //   }
    // },
    // scheduleDrawElevations() {
    //   this.clearRedrawElevationsTimeoutHandle();
    //   this.setRedrawElevationsTimeoutHandle(setTimeout(this.drawElevations, this.redrawTimeOutSeconds * 1000));
    //   console.log('Scheduled Redraw elevations in ', this.redrawTimeOutSeconds, 'seconds');
    // }

  },
});
