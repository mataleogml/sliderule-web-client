import { defineStore } from 'pinia'
import type { SrMultiSelectTextItem } from '@/components/SrMultiSelectText.vue';
import type { SrMultiSelectNumberItem } from '@/components/SrMultiSelectNumber.vue';
import type { SrMenuMultiCheckInputOption } from '@/components/SrMenuMultiCheckInput.vue';
import type { AtlReqParams, AtlpReqParams, SrRegion, OutputFormat } from '@/sliderule/icesat2';
import { getBeamsAndTracksWithGts } from '@/utils/parmUtils';
import { type SrListNumberItem } from '@/stores/atlChartFilterStore';
export interface NullReqParams {
  null: null;
}

export type ReqParams = AtlReqParams | AtlpReqParams | NullReqParams;

interface YapcConfig {
  score: number;
  knn?: number; // Optional property
  window_height?: number; // Optional property
  window_width?: number; // Optional property
}

export const useReqParamsStore = defineStore('reqParams', {

    state: () => ({
        missionValue: {name: 'ICESat-2', value: 'ICESat-2'},
        missionItems:[{name:'ICESat-2',value:'ICESat-2'},{name:'GEDI',value:'GEDI'}],
        iceSat2SelectedAPI: {name: 'atl06', value: 'atl06'},
        iceSat2APIsItems: [{name:'atl06',value:'atl06'},{name:'atl03',value:'atl03'},{name:'atl08',value:'atl08'},{name:'atl24',value:'atl24'}],
        gediSelectedAPI: {name:'gedi01b',value:'gedi01b'},
        gediAPIsItems: [{name:'gedi01b',value:'gedi01b'},{name:'gedi02a',value:'gedi02a'},{name:'gedi04a',value:'gedi04a'}],
        using_worker: false,
        asset: 'icesat2',
        isArrowStream: false,
        isFeatherStream: false,
        useRasterizePolygon: false,
        rasterizePolyCellSize: 0.0001,
        ignorePolygon: false,
        poly: null as SrRegion | null,
        convexHull: null as SrRegion | null,
        urlValue: 'slideruleearth.io',
        enableGranuleSelection: false,
        tracks: [] as SrListNumberItem[],
        selectAllTracks: false,
        beams: [] as SrListNumberItem[],
        selectAllBeams: false,
        useRGT: false,
        rgtValue: 1,
        useCycle: false,
        cycleValue: 1,
        useRegion: false,
        regionValue: 1,
        t0Value: '2020-01-01',
        t1Value: '2020-01-01',
        totalTimeoutValue: 600,
        useReqTimeout: false,
        reqTimeoutValue: 600,
        useNodeTimeout: false,
        nodeTimeoutValue: 1,
        useReadTimeout: false,
        readTimeoutValue: 1,
        lengthValue: 40.0,
        stepValue: 20.0,
        confidenceValue: 4,
        iterationsValue: 6,
        spreadValue: 20.0,
        PE_CountValue: 10,
        windowValue: 3.0,
        sigmaValue: 5.0,
        enableAtl03Confidence: false,
        surfaceReferenceTypeOptions: [
          { name: 'Dynamic', value: -1 },
          { name: 'Land', value: 0 },
          { name: 'Ocean', value: 1 },
          { name: 'Sea Ice', value: 2 },
          { name: 'Land Ice', value: 3 },
          { name: 'Inland Water',value: 4 },
        ] as SrMultiSelectNumberItem[],
        surfaceReferenceType:[] as number[],
        signalConfidenceOptions: 
        [
          { name: 'TEP', value: 'atl03_tep' },
          { name: 'Not Considered', value: 'atl03_not_considered' },
          { name: 'Background', value: 'atl03_background' },
          { name: 'Within 10m', value: 'atl03_within_10m' },
          { name: 'Low', value: 'atl03_low' },
          { name: 'Medium', value: 'atl03_medium' },
          { name: 'High', value: 'atl03_high' },
        ] as SrMultiSelectTextItem[],
        signalConfidence: [ 
          'atl03_background' ,
          'atl03_within_10m' ,
          'atl03_low' ,
          'atl03_medium' ,
          'atl03_high' ,
        ],

        signalConfidenceNumberOptions: 
        [
          { name: 'TEP', value: -2 },
          { name: 'Not Considered', value: -1 },
          { name: 'Background', value: 0 },
          { name: 'Within 10m', value: 1 },
          { name: 'Low', value: 2 },
          { name: 'Medium', value: 3 },
          { name: 'High', value: 4 },
        ] as SrMultiSelectNumberItem[],
        signalConfidenceNumber: [ 4 ],
        qualityPHOptions: [
          { name: 'Nominal', value: 0 },
          { name: 'Possible Afterpulse', value: 1 },
          { name: 'Possible Impulse Response Effect', value: 2 },
          { name: 'Possible TEP', value: 3 },
        ] as SrMultiSelectNumberItem[],
        qualityPHNumber: [0],
        enableAtl08Classification: false,
        atl08LandTypeOptions: [
          {name:'Noise', value:'atl08_noise'}, 
          {name:'Ground', value: 'atl08_ground'},
          {name:'Canopy', value:'atl08_canopy'},
          {name:'Top of Canopy', value:'atl08_top_of_canopy'},
          {name:'Unclassified', value:'atl08_unclassified'},
          ] as SrMultiSelectTextItem[], 
        atl08LandType: [] as string[],
        distanceInOptions:[
          { name: 'meters', value: 'meters' },
          { name: 'segments', value: 'segments' },
        ] as SrMultiSelectTextItem[],
        distanceIn: { name: 'meters', value: 'meters' },
        passInvalid: false,
        alongTrackSpread: 20.0,
        minimumPhotonCount: 10,
        maxIterations: 6,
        minWindowHeight: 3.0,
        maxRobustDispersion: 0.0,
        binSize: 0.0,
        geoLocation: {name: "mean", value: "mean"},
        geoLocationOptions: [
          { name: 'mean', value: 'mean' },
          { name: 'median', value: 'median' },
          { name: 'center', value: 'center' },
        ] as SrMultiSelectTextItem[],
        useAbsoluteHeights: false,
        sendWaveforms: false,
        useABoVEClassifier: false,
        gediBeams: [0,1,2,3,5,6,8,11] as number[],
        gediBeamsOptions: [
          {name:'0',value:0}, 
          {name:'1',value:1},
          {name:'2',value:2},
          {name:'3',value:3},
          {name:'5',value:5},
          {name:'6',value:6},
          {name:'8',value:8},
          {name:'11',value:11},
        ] as SrMultiSelectNumberItem[],

        ATL03GeoSpatialFieldsOptions:['Field_1', 'Field_2', 'Field_3'],
        ATL03PhotonFieldsOptions:['Field_1', 'Field_2', 'Field_3'],
        ATL06IceSegmentFieldsOptions:['Field_1', 'Field_2', 'Field_3'],
        ATL08LandSegmentFieldsOptions:[
          { label: 'Option 1', value: 'opt1', selected: false, additionalParameter: false },
          { label: 'Option 2', value: 'opt2', selected: false, additionalParameter: false },
          { label: 'Option 3', value: 'opt3', selected: false, additionalParameter: false },
        ] as SrMenuMultiCheckInputOption[],
        degradeFlag: false,
        l2QualityFlag: false,
        l4QualityFlag: false,
        surfaceFlag: false,
        fileOutput: true, // always fetch data as a parquet file
        staged: false,
        outputFormat: {name:"parquet", value:"parquet"},
        outputFormatOptions: [ // TBD. Alway fet data as a parquet file. This will eventually be used for an Export feature
          {name:"feather", value:"feather"},
          {name:"geoparquet", value:"geoparquet"},
          {name:"parquet", value:"parquet"},
          {name:"csv", value:"csv"},
        ],
        outputLocation: {name:"local", value:"local"},
        outputLocationOptions: [
          {name:"local", value:"local"},
          {name:"S3", value:"S3"},
        ],
        outputLocationPath: '',
        awsRegion: {name:"us-west-2", value:"us-west-2"},
        awsRegionOptions: [
          {name:"us-west-2", value:"us-west-2"},
          {name:"us-west-1", value:"us-west-1"},
          {name:"us-east-2", value:"us-east-2"},
          {name:"us-east-1", value:"us-east-1"},
          {name:"eu-west-1", value:"eu-west-1"},
          {name:"eu-west-2", value:"eu-west-2"},
          {name:"eu-central-1", value:"eu-central-1"},
          {name:"ap-southeast-1", value:"ap-southeast-1"},
          {name:"ap-southeast-2", value:"ap-southeast-2"},
          {name:"ap-northeast-1", value:"ap-northeast-1"},
          {name:"ap-northeast-2", value:"ap-northeast-2"},
          {name:"ap-south-1", value:"ap-south-1"},
          {name:"sa-east-1", value:"sa-east-1"},
        ],
        enableYAPC: false,
        YAPCScore: 0.0,
        usesYAPCKnn: false,
        YAPCKnn: 0,
        usesYAPCWindowHeight: false,
        YAPCWindowHeight: 0.0,
        usesYAPCWindowWidth: false,
        YAPCWindowWidth: 0.0,
        usesYAPCVersion: false,
        YAPCVersion: {name:"version1", value:"version1"},
        YAPCVersionOptions: [
          {name:"version1", value:"version1"},
          {name:"version2", value:"version2"},
          {name:"version3", value:"version3"},
        ],

        resources: [] as string[],
        target_numAtl06Recs: 0,
        target_numAtl06pRecs: 0,
        useChecksum: false,
    }),
    actions: {
        getUseRasterizePolygon() {
            return this.useRasterizePolygon;
        },
        setUseRasterizePolygon(value:boolean) {
            this.useRasterizePolygon = value;
        },
        getRasterizePolyCellSize() {
            return this.rasterizePolyCellSize;
        },
        setRasterizePolyCellSize(value:number) {
            this.rasterizePolyCellSize = value;
        },
        addResource(resource: string) {
          if (resource.trim().length) {
            this.resources.push(resource);
          }
        },
        removeResource(index: number) {
          this.resources.splice(index, 1);
        },
        getAtlReqParams(req_id: number): AtlReqParams { 
          const getOutputPath = (): string => {
            let path = this.outputLocationPath;
            if (this.outputLocation.value === 'S3') {
              path = `s3://${this.outputLocationPath}`;
            }
            if (this.outputLocationPath.length === 0) {
              //Note: This is only used by the server. It needs to be unique for each request.
              // We create a similar filename for our local client elsewhere.
              path = `${this.iceSat2SelectedAPI.value}_${req_id}_SVR_TMP_${new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-').replace(/T/g, '-').replace(/Z/g, '')}`;
            }
            return path;
          };
        
          const getOutputFormat = (path: string): OutputFormat | undefined => {
            if (this.outputFormat.value === 'geoparquet' || this.outputFormat.value === 'parquet') {
              path += '.parquet';
              return {
                format: 'parquet',
                as_geo: this.outputFormat.value === 'geoparquet',
                path: path,
                with_checksum: this.useChecksum,
              };
            }
            console.error('getAtlReqParams: outputFormat not recognized:', this.outputFormat.value);
            return undefined;
          };
        
          const req: AtlReqParams = {
            asset: this.asset,
            srt: this.getSrt(),
            cnf: this.signalConfidenceNumber,
            ats: this.alongTrackSpread,  
            cnt: this.minimumPhotonCount,
            H_min_win: this.minWindowHeight, 
            len: this.lengthValue,        
            res: this.stepValue, 
            sigma_r_max: this.sigmaValue,         
            maxi: this.maxIterations,
            poly: this.poly,
          };
        
          if (this.fileOutput) {
            const path = getOutputPath();
            const output = getOutputFormat(path);
            if (output) {
              req.output = output;
              this.isArrowStream = true;
            }
          }
        
          if (this.enableGranuleSelection) {
            if (this.tracks.length > 0) {
              req.tracks = this.tracks.map(track => track.value);
            }
            if (this.beams.length > 0) {
              req.beams = this.beams.map(beam => beam.value);
            }
          }
          if(this.enableAtl03Confidence) {
            req.quality_ph = this.qualityPHNumber;
          }

          if(this.enableAtl08Classification) {
            req.alt08_class = this.atl08LandType;
          }
          if(this.enableYAPC) {
            const yapc:YapcConfig = {
              score: this.YAPCScore,
            };
            if(this.usesYAPCKnn) {
              yapc.knn = this.YAPCKnn
            }
            if(this.usesYAPCWindowHeight) {
              yapc.window_height= this.YAPCWindowHeight
            }
            req.yapc = yapc;
          }
          if (this.poly && this.convexHull) {
            req.cmr = { polygon: this.convexHull };
          }
          if(this.getUseRasterizePolygon() && this.poly) {
            req.raster = {
              data: this.poly,
              length: this.poly.length,
              cellsize: this.getRasterizePolyCellSize(),
            }
          }
          if(this.distanceIn.value === 'segments') {
            req.dist_in_seg = true;
          }
          return req;
        },
        setSrt(srt:number[]) {
          this.surfaceReferenceType = srt;
        },
        getSrt(): number[] | number {
          if (this.surfaceReferenceType.length===1 &&  this.surfaceReferenceType[0]===-1){
            return -1;
          } else {
            return this.surfaceReferenceType;
          }        
        },
        getAtlpReqParams(req_id: number): AtlpReqParams {
          const baseParams:AtlpReqParams = {
            parms: this.getAtlReqParams(req_id),
          };
      
          if (this.resources.length > 0) {
            baseParams['resources'] = this.resources;
          }
          return baseParams;
        },
        getUseRgt() {
            return this.useRGT;
        },
        setUseRgt(useRGT:boolean) {
            this.useRGT = useRGT;
        },
        setRgt(rgtValue:number) {
          this.rgtValue = rgtValue;
        },
        getRgt() {
          return this.rgtValue;
        },
        setUseCycle(useCycle:boolean) {
            this.useCycle = useCycle;
        },
        getUseCycle() {
            return this.useCycle;
        },
        setCycle(cycleValue:number) {
          this.cycleValue = cycleValue;
        },
        getCycle() {
          return this.cycleValue;
        },
        setUseRegion(useRegion:boolean) {
            this.useRegion = useRegion;
        },
        getUseRegion() {
            return this.useRegion;
        },
        setRegion(regionValue:number) {
          this.regionValue = regionValue;
        },
        getRegion() {
          return this.regionValue;
        },
        setT0(t0Value:string) {
          this.t0Value = t0Value;
        },
        getT0() {
          return this.t0Value;
        },
        setT1(t1Value:string) {
          this.t1Value = t1Value;
        },
        getT1() {
          return this.t1Value;
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
        setBeamsAndTracksWithGts(gts:SrListNumberItem[]) {
          console.log('setBeamsAndTracksWithGts:', gts);
          const parms = getBeamsAndTracksWithGts(gts);
          this.setBeams(parms.beams);
          this.setTracks(parms.tracks);
        },
        setTracks(tracks: SrListNumberItem[]) {
          this.tracks = tracks;
        },
        getTracks() {
          return this.tracks;
        },
        setSelectAllTracks(selectAllTracks:boolean) {
          this.selectAllTracks = selectAllTracks;
        },
        getSelectAllTracks() {
          return this.selectAllTracks;
        },
        setSelectAllBeams(selectAllBeams:boolean) {
          this.selectAllBeams = selectAllBeams;
        },
        getSelectAllBeams() {
          return this.selectAllBeams;
        },
        setUseChecksum(useChecksum:boolean) {
          this.useChecksum = useChecksum;
        },
        getUseChecksum() {
          return this.useChecksum;
        },
        setAsset(asset:string) {
          this.asset = asset;
        },
        getAsset() {
          return this.asset;
        },
        initParmsForGenUser() {
          this.asset = 'icesat2';
          this.surfaceReferenceType = [-1];
          this.signalConfidenceNumber = [4];
          this.alongTrackSpread = 20.0;
          this.minimumPhotonCount = 10;
          this.maxIterations = 6;
          this.minWindowHeight = 3.0;
          this.sigmaValue = 5.0;
          this.fileOutput = true;
          this.outputFormat = {name:"parquet", value:"parquet"};
          this.useChecksum = false;
          this.stepValue = 20.0;
          this.lengthValue = 40.0;
          this.outputLocationPath=''; // forces auto creation of a unique path
        },
        setUseReqTimeout(useReqTimeout:boolean) {
          this.useReqTimeout = useReqTimeout;
        },
        getUseReqTimeout() {
          return this.useReqTimeout;
        },
        setReqTimeout(reqTimeoutValue:number) {
          this.reqTimeoutValue = reqTimeoutValue;
        },
        getReqTimeout() {
          return this.reqTimeoutValue;
        },
        setUseNodeTimeout(useNodeTimeout:boolean) {
          this.useNodeTimeout = useNodeTimeout;
        },
        getUseNodeTimeout() {
          return this.useNodeTimeout;
        },
        setNodeTimeout(nodeTimeoutValue:number) {
          this.nodeTimeoutValue = nodeTimeoutValue;
        },
        getNodeTimeout() {
          return this.nodeTimeoutValue;
        },
        setUseReadTimeout(useReadTimeout:boolean) {
          this.useReadTimeout = useReadTimeout;
        },
        getUseReadTimeout() {
          return this.useReadTimeout;
        },
        getReadTimeout() {
          return this.readTimeoutValue;
        },
        setReadTimeout(readTimeoutValue:number) {
          this.readTimeoutValue = readTimeoutValue;
        },
        getUseYAPCKnn() {
          return this.usesYAPCKnn;
        },
        setUseYAPCKnn(value:boolean) {
          this.usesYAPCKnn = value;
        },
        getYAPCKnn() {
          return this.YAPCKnn;
        },
        setYAPCKnn(value:number) {
          this.YAPCKnn = value;
        },
        getYAPCWindowHeight() {
          return this.YAPCWindowHeight;
        },
        setYAPCWindowHeight(value:number) {
          this.YAPCWindowHeight = value;
        },
        getUsesYAPCWindowWidth() {
          return this.usesYAPCWindowWidth;
        },
        setUsesYAPCWindowWidth(value:boolean) {
          this.usesYAPCWindowWidth = value;
        },
        getUsesYAPCWindowHeight() {
          return this.usesYAPCWindowHeight;
        },
        setUsesYAPCWindowHeight(value:boolean) {
          this.usesYAPCWindowHeight = value;
        },
        getYAPCWindowWidth() {
          return this.YAPCWindowWidth;
        },
        setYAPCWindowWidth(value:number) {
          this.YAPCWindowWidth = value;
        },
        getYAPCVersion() {
          return this.YAPCVersion;
        },
        setYAPCVersion(value:{name:string, value:string}) {
          this.YAPCVersion = value;
        },
        getMissionValue() {
          return this.missionValue;
        },
        setMissionValue(value:{name:string, value:string}) {
          this.missionValue = value;
        },
        getMissionItems() {
          return this.missionItems;
        },
        getIceSat2SelectedAPI() {
          return this.iceSat2SelectedAPI;
        },
    },
})


