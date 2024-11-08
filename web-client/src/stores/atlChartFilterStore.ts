import { defineStore } from 'pinia';
import { getBeamsAndTracksWithGts } from '@/utils/parmUtils';
import { beamsOptions, tracksOptions } from '@/utils/parmUtils';
import { getHeightFieldname } from '@/utils/SrParquetUtils';
import type { SrScatterOptionsParms } from '@/utils/parmUtils';
import { ref } from 'vue';
import VChart from "vue-echarts";
import { get } from 'lodash';


export interface SrListNumberItem {
  label: string;
  value: number;
}

export const useAtlChartFilterStore = defineStore('atlChartFilter', {
  state: () => ({
    debugCnt: 0 as number,
    tracks: [] as SrListNumberItem[],
    tracksOptions: tracksOptions as SrListNumberItem[],
    selectAllTracks: true as boolean,
    beams: [] as SrListNumberItem[],
    spotsOptions: [{label:'1',value:1},{label:'2',value:2},{label:'3',value:3},{label:'4',value:4},{label:'5',value:5},{label:'6',value:6}] as SrListNumberItem[],
    spots: [] as SrListNumberItem[],
    rgts: [] as SrListNumberItem[],
    rgtOptions: [] as SrListNumberItem[], // Ensure rgtOptions is an array
    cycles: [] as SrListNumberItem[],
    cycleOptions: [] as SrListNumberItem[],
    regionValue: 1 as number,
    currentFile: '' as string,
    currentReqId: 0 as number,
    min_x: 0 as number,
    max_x: 0 as number,
    min_y: 0 as number,
    max_y: 0 as number,
    updateScatterPlotCnt: 0 as number,
    elevationDataOptions: [{ name: 'not_set', value: 'not_set' }] as { name: string, value: string }[],
    yDataForChart: [] as string[],
    xDataForChart: 'x_atc' as string,
    ndxOfelevationDataOptionsForHeight: 0,
    func: 'xxx' as string,
    description: 'description here' as string,
    pairs: [] as SrListNumberItem[],
    pairOptions: [{ label: '0', value: 0 }, { label: '1', value: 1 }] as SrListNumberItem[],
    scOrients: [] as SrListNumberItem[],
    scOrientOptions: [{ label: '0', value: 0 }, { label: '1', value: 1 }] as SrListNumberItem[],
    size: NaN as number,
    isLoading: false as boolean,
    clearScatterPlotFlag: false as boolean,
    chartDataRef: ref<number[][]>([]),
    atl03QuerySql: '' as string,
    atl06QuerySql: '' as string,  
    atl08QuerySql: '' as string,
    atl03spWhereClause: '' as string,
    atl03vpWhereClause: '' as string,
    atl06WhereClause: '' as string,
    atl08pWhereClause: '' as string,
    atl03spSymbolSize: 1 as number,
    atl03vpSymbolSize: 5 as number,
    atl06SymbolSize: 5 as number,
    atl08SymbolSize: 5 as number,
    message: 'Failed to load data. Please try again later.' as string,
    isWarning: false as boolean,
    showMessage: false as boolean,
    recCnt: 0 as number,
    largeData: false as boolean,
    largeDataThreshold: 1000000 as number,
    numOfPlottedPnts: 0 as number,
    plotRef: null as InstanceType<typeof VChart> | null, 
    selectedAtl03ColorMap: {name:'viridis', value:'viridis'} as {name:string, value:string},
    xLegend: 'Meters' as string,
}),

  actions: {
    setRegion(regionValue: number) {
      this.regionValue = regionValue;
    },
    getRegion() {
      return this.regionValue;
    },
    setBeams(beams: SrListNumberItem[]) {
      this.beams = beams;
    },
    getBeams() {
      return this.beams;
    },
    getBeamValues() { 
      return this.beams.map(beam => beam.value);
    },
    setSpots(spots: SrListNumberItem[]) {
      //console.log('atlChartFilterStore setSpots:', spots);
      this.spots = spots;
    },
    getSpots(): SrListNumberItem[] {
      return this.spots;
    },
    getSpotValues() {
      return this.spots.map(spot => spot.value);
    },
    setSpotWithNumber(spot: number) {
      //console.log('atlChartFilterStore.setSpotWithNumber():', spot);
      this.setSpots([{ label: spot.toString(), value: spot }]);
    },
    setRgts(rgts: SrListNumberItem[]) {
      //console.log('atlChartFilterStore setRgts:', rgts);
      this.rgts = rgts;
    },
    getRgts() {
      //console.log('atlChartFilterStore getRgts:', this.rgts);
      return this.rgts;
    },
    getRgtValues() {
      return this.rgts.map(rgt => rgt.value);
    },
    getCycleValues() {
      return this.cycles.map(cycle => cycle.value);
    },
    setRgtOptionsWithNumbers(rgtOptions: number[]) {
      if (!Array.isArray(rgtOptions)) {
        console.error('rgtOptions is not an array:', rgtOptions);
        return;
      }
      this.rgtOptions = rgtOptions.map(option => ({ label: option.toString(), value: option }));
      //console.log('atlChartFilterStore.setRgtOptionsWithNumbers():', rgtOptions,' this.rgtOptions:', this.rgtOptions);
    },
    getRgtOptions() {
      //console.log('atlChartFilterStore.getRgtOptions():', this.rgtOptions);
      return this.rgtOptions;
    },
    setRgtWithNumber(rgt: number) {
      //console.log('atlChartFilterStore.setRgtWithNumber():', rgt);
      this.setRgts([{ label: rgt.toString(), value: rgt }]);
    },
    setCycleOptionsWithNumbers(cycleOptions: number[]) {
      if (!Array.isArray(cycleOptions)) {
        console.error('cycleOptions is not an array:', cycleOptions);
        return;
      }
      this.cycleOptions = cycleOptions.map(option => ({ label: option.toString(), value: option }));
      //console.log('atlChartFilterStore.setCycleOptionsWithNumbers():', cycleOptions, ' this.cycleOptions:', this.cycleOptions);
    },
    getCycleOptions() {
      //console.log('atlChartFilterStore.getCycleOptions():', this.cycleOptions);
      return this.cycleOptions;
    },
    setCycleWithNumber(cycle: number) {
      //console.log('atlChartFilterStore.setCycleWithNumber():', cycle);
      this.setCycles([{ label: cycle.toString(), value: cycle }]);
    },
    setCycles(cycles: SrListNumberItem[]) {
      //console.log('atlChartFilterStore.setCycles():', cycles);
      this.cycles = cycles;
    },
    getCycles() {
      //console.log('atlChartFilterStore.getCycles():', this.cycles);
      return this.cycles;
    },
    setTracks(tracks: SrListNumberItem[]) {
      this.tracks = tracks;
    },
    getTracks() {
      return this.tracks;
    },
    setTrackOptions(trackOptions: SrListNumberItem[]) {
      this.tracksOptions = trackOptions;
    },
    getTrackOptions() {
      return this.tracksOptions;
    },
    setTrackWithNumber(track: number) {
      this.setTracks([{ label: track.toString(), value: track }]);
      //console.log('atlChartFilterStore.setTrackWithNumber(', track,') tracks:', this.tracks);
    },
    setTrackOptionsWithNumbers(tracks: number[]) {
      this.setTrackOptions(tracks.map(track => ({ label: track.toString(), value: track })));
    },
    getTrackValues() {
      return this.tracks.map(track => track.value);
    },
    setSelectAllTracks(selectAllTracks: boolean) {
      this.selectAllTracks = selectAllTracks;
    },
    getSelectAllTracks() {
      return this.selectAllTracks;
    },
    appendTrackWithNumber(track: number) {
      // Check if the track already exists in the list
      const trackExists = this.tracks.some(t => t.value === track);
      // If it doesn't exist, append it
      if (!trackExists) {
        this.tracks.push({ label: track.toString(), value: track });
      }
    },    
    setBeamsAndTracksWithGts(gts: SrListNumberItem[]) {
      //console.log('atlChartFilterStore.setBeamsAndTracksWithGts(',gt,')');
      const parms = getBeamsAndTracksWithGts(gts);
      this.setBeams(parms.beams);
      this.setTracks(parms.tracks);
    },
    setTracksForBeams(input_beams: SrListNumberItem[]) {    
      const tracks = input_beams
        .map(beam => tracksOptions.find(track => Number(beam.label.charAt(2)) === track.value))
        .filter((track): track is SrListNumberItem => track !== undefined);
        this.setTracks(tracks);
    },
    setBeamsForTracks(input_tracks: SrListNumberItem[]) {
      const beams = input_tracks
        .map(track => beamsOptions.find(option => Number(track) === Number(option.label.charAt(2))))
        .filter((beam): beam is SrListNumberItem => beam !== undefined);
      this.setBeams(beams);
      //console.log('atlChartFilterStore.setBeamsForTracks(',input_tracks,') beams:', beams);
    },
    setBeamWithNumber(beam: number) {
      this.setBeams([{ label: beamsOptions.find(option => option.value === beam)?.label || '', value: beam }]);
    },
    setReqId(req_id: number) {
      this.currentReqId = req_id;
    },
    getReqId() {
      return this.currentReqId;
    },
    setFileName(filename: string) {
      this.currentFile = filename;
    },
    getFileName() {
      return this.currentFile;
    },
    setMinX(min_x: number) {
      this.min_x = min_x;
    },
    getMinX() {
      return this.min_x;
    },
    setMaxX(max_x: number) {
      this.max_x = max_x;
    },
    getMaxX() {
      return this.max_x;
    },
    setMinY(min_y: number) {
      this.min_y = min_y;
    },
    getMinY() {
      return this.min_y;
    },
    setMaxY(max_y: number) {
      this.max_y = max_y;
    },
    getMaxY() {
      return this.max_y;
    },
    incrementDebugCnt() {
      return ++this.debugCnt;
    },
    getDebugCnt() {
      return this.debugCnt;
    },
    setDebugCnt(cnt: number) {
      this.debugCnt = cnt;
    },
    async setElevationDataOptionsFromFieldNames(fieldNames: string[]) {
      const elevationDataOptions = fieldNames.map(fieldName => ({ name: fieldName, value: fieldName }));
      const heightFieldname = await getHeightFieldname(this.currentReqId);
      this.ndxOfelevationDataOptionsForHeight = fieldNames.indexOf(heightFieldname);
      this.setElevationDataOptions(elevationDataOptions);
    },
    getElevationDataOptions() {
      return this.elevationDataOptions;
    },
    setElevationDataOptions(elevationDataOptions: { name: string, value: string }[]) {
      this.elevationDataOptions = elevationDataOptions;
    },
    getYDataForChart() {
      return this.yDataForChart;
    },
    setYDataForChart(yDataForChart: string[]) {
      this.yDataForChart = yDataForChart;
    },    
    getXDataForChart() {
      return this.xDataForChart;
    },
    setXDataForChart(xDataForChart: string) {
      this.xDataForChart = xDataForChart;
    },
    setXDataForChartUsingFunc(func: string) {
      if (func.includes('atl03')) {
        this.setXDataForChart('x_atc');
        if (func.includes('atl03vp')) {
          this.setXDataForChart('segment_dist_x');
        }
      } else if (func.includes('atl06')) {
        this.setXDataForChart('x_atc');
      } else if (func.includes('atl08')) {
        this.setXDataForChart('x_atc');
      } else {
        console.error('setXDataForChartFromFunc() unknown function:', func);
      }
    },
    getNdxOfelevationDataOptionsForHeight() {
      return this.ndxOfelevationDataOptionsForHeight;
    },
    setFunc(func: string) {
      this.func = func;
    },
    getFunc() {
      return this.func;
    },
    setDescription(description: string) {
      this.description = description;
    },
    getDescription() {
      return this.description;
    },
    setPairs(pairs: SrListNumberItem[]) {
      this.pairs = pairs;
    },
    getPairs() {
      return this.pairs;
    },
    setPairOptions(pairs: SrListNumberItem[]) {
      this.pairOptions = pairs;
    },
    getPairOptions() {
      return this.pairOptions;
    },
    setPairOptionsWithNumbers(pairs: number[]) {
      this.pairOptions = pairs.map(pair => ({ label: pair.toString(), value: pair }));
    },
    setPairWithNumber(pair: number) {
      this.pairs = [{ label: pair.toString(), value: pair }];
    },
    appendPairWithNumber(pair: number) {
      const pairExists = this.pairs.some(p => p.value === pair);
      if(!pairExists){
        this.pairs.push({ label: pair.toString(), value: pair });
      }
    },
    getPairValues() {
      return this.pairs.map(pair => pair.value);
    },
    setScOrients(scOrients: SrListNumberItem[]) {
      this.scOrients = scOrients;
    },
    getScOrients() {
      return this.scOrients;
    },
    setScOrientOptions(scOrientOptions: SrListNumberItem[]) {
      this.scOrientOptions = scOrientOptions;
    },
    getScOrientOptions() {
      return this.scOrientOptions;
    },
    setScOrientOptionsWithNumbers(scOrientOptions: number[]) {
      this.scOrientOptions = scOrientOptions.map(option => ({ label: option.toString(), value: option }));
    },
    setScOrientWithNumber(scOrient: number) {
      this.scOrients = [{ label: scOrient.toString(), value: scOrient }];
    },
    getScOrientValues() {
      return this.scOrients.map(scOrient => scOrient.value);
    },
    appendScOrientWithNumber(scOrient: number) {
      const scoExists = this.scOrients.some(sco => sco.value === scOrient);
      if(!scoExists && (scOrient >= 0)){
        this.scOrients.push({ label: scOrient.toString(), value: scOrient });
      }
    },
    setSize(size: number) {
      this.size = size;
    },
    getSize() {
      return this.size;
    },
    getScatterOptionsParms(): SrScatterOptionsParms {
      //console.log('atlChartFilterStore.getScatterOptionsParms() this.rgts[0]?.value:',this.rgts[0]?.value);
      const sop =  {
        rgts: this.rgts.map(rgt => rgt?.value).filter(value => value !== undefined),
        cycles: this.cycles.map(cycle => cycle?.value).filter(value => value !== undefined),
        fileName: this.currentFile,
        func: this.func,
        y: this.getYDataForChart(),
        x: this.getXDataForChart(),
        beams: this.beams.map(beam => beam.value),
        spots: this.spots.map(spot => spot.value),
        pairs: this.pairs.map(pair => pair.value).filter(value => value !== undefined),
        scOrients: this.scOrients.map(scOrient => scOrient.value).filter(value => value !== undefined),
        tracks: this.tracks.map(track => track.value),
      };
      //console.log('atlChartFilterStore.getScatterOptionsParms():', sop);
      return sop;
    },
    updateScatterPlot() {
      this.updateScatterPlotCnt += 1;
      //console.log('atlChartFilterStore.updateScatterPlot():', this.updateScatterPlotCnt);
    },
    setIsLoading() {
      //console.log('atlChartFilterStore.setIsLoading()');
      this.isLoading = true;
    },
    resetIsLoading() {
      //console.log('atlChartFilterStore.resetIsLoading()');
      this.isLoading = false;
    },
    getIsLoading() {
      //console.log('atlChartFilterStore.getIsLoading():', this.isLoading);
      return this.isLoading;
    },
    resetTheScatterPlot() {
      this.clearScatterPlotFlag = true;
    },
    resetClearScatterPlotFlag() {
      this.clearScatterPlotFlag = false;
    },
    getClearPlot() {
      return this.clearScatterPlotFlag;
    },
    setAtl03QuerySql(sql: string) {
      this.atl03QuerySql = sql;
    },
    getAtl03QuerySql() {
      return this.atl03QuerySql;
    },
    setAtl03spWhereClause(sql: string) {
      this.atl03spWhereClause = sql;
    },
    getAtl03spWhereClause() {
      return this.atl03spWhereClause
    },
    setAtl03vpWhereClause(sql: string) {
      this.atl03vpWhereClause = sql;
    },
    getAtl03vpWhereClause() {
      return this.atl03vpWhereClause
    },
    setAtl06WhereClause(sql: string) {
      this.atl06WhereClause = sql;
    },
    getAtl06WhereClause() {
      return this.atl06WhereClause;
    },
    setAtl08pWhereClause(sql: string) {
      this.atl08pWhereClause = sql;
    },
    getAtl08pWhereClause() {
      return this.atl08pWhereClause;
    },
    setAtl06QuerySql(sql: string) {
      this.atl06QuerySql = sql;
    },
    getAtl06QuerySql() {
      return this.atl06QuerySql;
    },
    setAtl08QuerySql(sql: string) {
      this.atl08QuerySql = sql;
    },
    getAtl08QuerySql() {
      return this.atl08QuerySql;
    },
    getSqlStmnt(func: string) {
      switch (func) {
        case 'atl03sp':
          return this.atl03QuerySql;
        case 'atl03vp':
          return this.atl03QuerySql;
        case 'atl06p':
          return this.atl06QuerySql;
        case 'atl06sp':
          return this.atl06QuerySql;
        case 'atl08p':
          return this.atl08QuerySql;
        default:
          return '';
      }
    },
    setAtl03spSymbolSize(size: number) {
      this.atl03spSymbolSize = size;
    },
    getAtl03spSymbolSize() {
      return this.atl03spSymbolSize;
    },
    setAtl03vpSymbolSize(size: number) {
      this.atl03vpSymbolSize = size;
    },
    getAtl03vpSymbolSize() {
      return this.atl03vpSymbolSize;
    },
    setAtl06SymbolSize(size: number) {
      this.atl06SymbolSize = size;
    },
    getAtl06SymbolSize() {
      return this.atl06SymbolSize;
    },
    setAtl08SymbolSize(size: number) {
      this.atl08SymbolSize = size;
    },
    getAtl08SymbolSize() {
      return this.atl08SymbolSize;
    },
    getSymbolSize() {
      if(this.func.includes('atl03sp')){
        return this.atl03spSymbolSize;
      } else if(this.func.includes('atl03vp')){
        return this.atl03vpSymbolSize;
      } else if(this.func.includes('atl06')){
        return this.atl06SymbolSize;
      } else if(this.func.includes('atl08')){
        return this.atl08SymbolSize;
      } else {
        console.warn('getSymbolSize() unknown function:',this.func);
        return 5;
      }        
    },
    getMessage() {
      return this.message;
    },
    setMessage(msg: string) {
      this.message = msg;
    },
    setIsWarning(isWarning: boolean) {
      this.isWarning = isWarning;
    },
    getIsWarning() {
      return this.isWarning;
    },
    setShowMessage(showMessage: boolean) {
      this.showMessage = showMessage;
    },
    getShowMessage() {
      return this.showMessage;
    },
    setRecCnt(recCnt: number) {
      this.recCnt = recCnt;
    },
    getRecCnt() {
      return this.recCnt;
    },

    getLargeData() {
      return this.largeData;
    },
    setLargeData(largeData: boolean) {
        this.largeData = largeData;
    },
    getLargeDataThreshold() {
        return this.largeDataThreshold;
    },
    setLargeDataThreshold(largeDataThreshold: number) {
        this.largeDataThreshold = largeDataThreshold;
    },
    getNumOfPlottedPnts() {
      return this.numOfPlottedPnts;
    },
    setNumOfPlottedPnts(numOfPlottedPnts: number) {
        this.numOfPlottedPnts = numOfPlottedPnts;
    },
    setPlotRef(ref: InstanceType<typeof VChart> | null) {
      this.plotRef = ref;
    },
    getPlotRef() {
      return this.plotRef;
    },
    getSelectedAtl03ColorMap() {
      return this.selectedAtl03ColorMap;
    },
    setSelectedAtl03ColorMap(selectedAtl03ColorMap: {name:string, value:string}) {
      this.selectedAtl03ColorMap = selectedAtl03ColorMap;
    },
    getXLegend() {
      return this.xLegend;
    },
    setXLegend(xLegend: string) {
      this.xLegend = xLegend;
    },
  }
});
