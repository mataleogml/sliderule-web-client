import { defineStore } from 'pinia'
import type { SrRadioBtnCategory } from '@/components/SrRadioButtonBox.vue';
import type { SrMultiSelectItem } from '@/components/SrMultiSelect.vue';
export const useReqParamsStore = defineStore('reqParams', {

    state: () => ({
        rasterizePolygon: false,
        ignorePolygon: false,
        missionValue: {name:'mission', value:'-2'},
        iceSat2SelectedAPI: {name:'ICESat-2 Api', value:'atl06'},
        gediSelectedAPI: {name:'GEDI Api', value:'gedi01b'},
        urlValue: 'slideruleearth.io',
        tracks:  ['Track 1', 'Track 2', 'Track 3'],
        tracksOptions: ['Track 1', 'Track 2', 'Track 3'],
        beams: ['gt1l', 'gt1r', 'gt2l', 'gt2r', 'gt3l', 'gt3r'],
        beamsOptions: ['gt1l', 'gt1r', 'gt2l', 'gt2r', 'gt3l', 'gt3r'], 
        rgtValue: 1,
        cycleValue: 1,
        regionValue: 1,
        t0Value: '2020-01-01',
        t1Value: '2020-01-01',
        reqTimeoutValue: 60,
        lengthValue: 40,
        stepValue: 20,
        confidenceValue: 4,
        iterationsValue: 6,
        spreadValue: 20.0,
        PE_CountValue: 10,
        windowValue: 3.0,
        sigmaValue: 5.0,
        surfaceTypeOptions: [
          { name: 'Land', value:'L' },
          { name: 'Ocean', value:'O' },
          { name: 'Sea Ice', value:'S'},
          { name: 'Land Ice', value:'I'},
          { name: 'Inland Water',value:'W' },
        ] as SrMultiSelectItem[],
        surfaceType:[] as string[],
        signalConfidenceOptions: [
          { name: 'TEP', value: '-2' },
          { name: 'Not Considered', value: '0' },
          { name: 'Background', value: '1' },
          { name: 'Within 10m', value: '?' },
          { name: 'Low', value: '2' },
          { name: 'Medium', value: '3' },
          { name: 'High', value: '4' },
        ] as SrRadioBtnCategory[],
        signalConfidence: 'Terrain Echo Photon (TEP)',
        landTypeOptions: [
          { name: 'noise', value: '0' },
          { name: 'ground', value: '1' },
          { name: 'canopy', value: '2' },
          { name: 'Top of Canopy', value: '3' },
          { name: 'unclassified', value: '4' },
        ] as SrMultiSelectItem[],
        landType: 'ground',
        YAPC: 0.0,
        distanceInOptions:[
          { name: 'meters', value: 'meters' },
          { name: 'segments', value: 'segments' },
        ] as SrMultiSelectItem[],
        distanceIn: 'meters',
        passInvalid: false,
        alongTrackSpread: 0.0,
        minimumPhotonCount: 0,
        maxIterations: 0,
        minWindowHeight: 0.0,
        maxRobustDispersion: 0.0,
        binSize: 0.0,
        geoLocation: {name: "mean", value: "mean"},
        geoLocationOptions: [
          { name: 'mean', value: 'mean' },
          { name: 'median', value: 'median' },
          { name: 'center', value: 'center' },
        ] as SrMultiSelectItem[],
        useAbsoluteHeights: false,
        sendWaveforms: false,
        useABoVEClassifier: false,
        gediBeams: [
          {name:'0',value:'0'}, 
          {name:'1',value:'1'},
          {name:'2',value:'2'},
          {name:'3',value:'3'},
          {name:'5',value:'5'},
          {name:'6',value:'6'},
          {name:'8',value:'8'},
          {name:'11',value:'11'},
        ],
        gediBeamsOptions: [
          {name:'0',value:'0'}, 
          {name:'1',value:'1'},
          {name:'2',value:'2'},
          {name:'3',value:'3'},
          {name:'5',value:'5'},
          {name:'6',value:'6'},
          {name:'8',value:'8'},
          {name:'11',value:'11'},
        ],
        ATL03GeoSpatialFieldsOptions:['Field_1', 'Field_2', 'Field_3'],
        ATL03PhotonFieldsOptions:['Field_1', 'Field_2', 'Field_3'],
        ATL06IceSegmentFieldsOptions:['Field_1', 'Field_2', 'Field_3'],
        ATL08LandSegmentFieldsOptions:['Field_1_Checkbox_TBD', 'Field_2Checkbox_TBD', 'Field_3Checkbox_TBD'],
        degradeFlag: false,
        l2QualityFlag: false,
        l4QualityFlag: false,
        surfaceFlag: false,
        saveOutput: false,
        staged: false,
        outputFormat: {name:"geoparquet", value:"geoparquet"},
        outputFormatOptions: [
          {name:"geoparquet", value:"geoparquet"},
          {name:"parquet", value:"parquet"},
          {name:"csv", value:"csv"},
        ],
        outputLocation: {name:"s3", value:"s3"},
        outputLocationOptions: [
          {name:"s3", value:"s3"},
          {name:"local", value:"local"},
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
    }),
    actions: {
        setRasterizePolygon(value:boolean) {
          this.rasterizePolygon = value;
        },
      },
})


