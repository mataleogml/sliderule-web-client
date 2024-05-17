import type { SrRequestSummary } from '@/db/SlideRuleDb';
import { defineStore } from 'pinia';

export const useCurAtl06ReqSumStore = defineStore('curAtl06ReqSum', {
    state: () => ({
        h_mean_min: 100000,
        h_mean_max: -100000,
        h_mean_low: 100000,   // 5th percentile
        h_mean_high: -100000, // 95th percentile
        lat_min: 90,
        lat_max: -90,
        lon_min: 180,
        lon_max: -180,
        num_atl06_recs: 0,
        num_arrow_data_recs: 0,
        num_arrow_meta_recs: 0,
        num_exceptions: 0,
        tgt_atl06_recs: 0,
        tgt_arrow_data_recs: 0,
        tgt_arrow_meta_recs: 0,
        tgt_exceptions: 0,
        read_state: 'idle',
        req_id: 0,
        duration: 0,
        is_arrow_stream: false,
    }),
    actions: {
        set_h_mean_Min(h_mean_min: number) {
            this.h_mean_min = h_mean_min;
        },
        set_h_mean_Max(h_mean_max: number) {
            this.h_mean_max = h_mean_max;
        },
        get_h_mean_Min() {
            return this.h_mean_min;
        },
        get_h_mean_Max() {
            return this.h_mean_max;
        },
        set_lat_Min(lat_min: number) {
            this.lat_min = lat_min;
        },
        set_lat_Max(lat_max: number) {
            this.lat_max = lat_max;
        },
        get_lat_Min() {
            return this.lat_min;
        },
        get_lat_Max() {
            return this.lat_max;
        },
        set_lon_Min(lon_min: number) {
            this.lon_min = lon_min;
        },
        set_lon_Max(lon_max: number) {
            this.lon_max = lon_max;
        },
        get_lon_Min() {
            return this.lon_min;
        },
        get_lon_Max() {
            return this.lon_max;
        },
        setReqId(req_id: number) {
            this.req_id = req_id;
        },
        getReqId() {
            return this.req_id;
        },
        setNumAtl06Recs(num_atl06_recs: number) {
            this.num_atl06_recs = num_atl06_recs;
        },
        getNumAtl06Recs() {
            return this.num_atl06_recs;
        },
        setNumArrowDataRecs(num_arrow_data_recs: number) {
            this.num_arrow_data_recs = num_arrow_data_recs;
        },
        getNumArrowDataRecs() {
            return this.num_arrow_data_recs;
        },
        setNumArrowMetaRecs(num_arrow_meta_recs: number) {
            this.num_arrow_meta_recs = num_arrow_meta_recs;
        },
        getNumArrowMetaRecs() {
            return this.num_arrow_meta_recs;
        },
        setTgtAtl06Recs(tgt_atl06_recs: number) {
            this.tgt_atl06_recs = tgt_atl06_recs;
        },
        getTgtAtl06Recs() {
            return this.tgt_atl06_recs;
        },
        setTgtArrowDataRecs(tgt_arrow_data_recs: number) {
            this.tgt_arrow_data_recs = tgt_arrow_data_recs;
        },
        getTgtArrowDataRecs() {
            return this.tgt_arrow_data_recs;
        },
        setTgtArrowMetaRecs(tgt_arrow_meta_recs: number) {
            this.tgt_arrow_meta_recs = tgt_arrow_meta_recs;
        },
        getTgtArrowMetaRecs() {
            return this.tgt_arrow_meta_recs;
        },
        setNumExceptions(num_exceptions: number) {
            this.num_exceptions = num_exceptions;
        },
        getNumExceptions() {
            return this.num_exceptions;
        },
        setTgtExceptions(tgt_exceptions: number) {
            this.tgt_exceptions = tgt_exceptions;
        },
        getTgtExceptions() {
            return this.tgt_exceptions;
        },
        setReadState(read_state: string) {
            this.read_state = read_state;
        },
        getReadState() {
            return this.read_state;
        },
        setIsArrowStream(is_arrow_stream: boolean) {
            this.is_arrow_stream = is_arrow_stream;
        },
        getIsArrowStream() {
            return this.is_arrow_stream;
        },
        get_h_mean_Low() {
            return this.h_mean_low;
        },
        get_h_mean_High() {
            return this.h_mean_high;
        },
        set_h_mean_Low(h_mean_low: number) {
            this.h_mean_low = h_mean_low;
        },
        set_h_mean_High(h_mean_high: number) {
            this.h_mean_high = h_mean_high;
        },
        setSummary(srs: SrRequestSummary) {
            if(srs.req_id){
                this.setReqId(srs.req_id);
            }
            if(srs){
                this.set_h_mean_Min(srs.extHMean.minHMean);
                this.set_h_mean_Max(srs.extHMean.maxHMean);
                this.set_lat_Min(srs.extLatLon.minLat);
                this.set_lat_Max(srs.extLatLon.maxLat);
                this.set_lon_Min(srs.extLatLon.minLon);
                this.set_lon_Max(srs.extLatLon.maxLon);
                this.set_h_mean_Low(srs.extHMean.lowHMean);
                this.set_h_mean_High(srs.extHMean.highHMean);
            } else {
                console.error('setSummary() called with null summary:', srs);
            }
        }
    },
});