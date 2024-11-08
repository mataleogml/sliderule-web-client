import type { SrRequestSummary } from '@/db/SlideRuleDb';
import { createDuckDbClient, type QueryResult } from './SrDuckDb';
import { db as indexedDb } from '@/db/SlideRuleDb';
import type { ExtHMean,ExtLatLon } from '@/workers/workerUtils';
import { updateElLayerWithObject,updateSelectedLayerWithObject,type ElevationDataItem } from './SrMapUtils';
import { getHeightFieldname } from "./SrParquetUtils";
import { useCurReqSumStore } from '@/stores/curReqSumStore';
import { useAtlChartFilterStore } from '@/stores/atlChartFilterStore';
import type { SrScatterOptionsParms } from './parmUtils';
import { useMapStore } from '@/stores/mapStore';
import { useAtl03ColorMapStore } from '@/stores/atl03ColorMapStore';
import { SrMutex } from './SrMutex';
import { useSrToastStore } from "@/stores/srToastStore";
import { srViews } from '@/composables/SrViews';

interface SummaryRowData {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    minHMean: number;
    maxHMean: number;
    lowHMean: number;
    highHMean: number;
    numPoints: number;
}
const srMutex = new SrMutex();

export async function duckDbReadOrCacheSummary(req_id: number, height_fieldname: string): Promise<SrRequestSummary | undefined> {
    const unlock = await srMutex.lock();
    try {
        const filename = await indexedDb.getFilename(req_id);
        const summary = await indexedDb.getWorkerSummary(req_id);
        //console.log('duckDbReadOrCacheSummary req_id:', req_id, ' summary:', summary);

        if (summary) {
            return summary;
        } else {
            const localExtLatLon: ExtLatLon = { minLat: 90, maxLat: -90, minLon: 180, maxLon: -180 };
            const localExtHMean: ExtHMean = { minHMean: 100000, maxHMean: -100000, lowHMean: 100000, highHMean: -100000 };
            const duckDbClient = await createDuckDbClient();
            let numPoints = 0;

            try {
                await duckDbClient.insertOpfsParquet(filename);
                //console.log('duckDbReadOrCacheSummary height_fieldname:', height_fieldname);

                const results = await duckDbClient.query(`
                    SELECT
                        MIN(latitude) as minLat,
                        MAX(latitude) as maxLat,
                        MIN(longitude) as minLon,
                        MAX(longitude) as maxLon,
                        MIN(${duckDbClient.escape(height_fieldname)}) as minHMean,
                        MAX(${duckDbClient.escape(height_fieldname)}) as maxHMean,
                        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY ${duckDbClient.escape(height_fieldname)}) AS perc10HMean,
                        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ${duckDbClient.escape(height_fieldname)}) AS perc90HMean,
                        COUNT(*) as numPoints
                        FROM
                        '${filename}'
                `);

                // Collect rows from the async generator in chunks
                const rows: SummaryRowData[] = [];
                //console.log('duckDbReadOrCacheSummary results:', results);
                for await (const chunk of results.readRows()) {
                    for (const row of chunk) {
                        const typedRow: SummaryRowData = {
                            minLat: row.minLat,
                            maxLat: row.maxLat,
                            minLon: row.minLon,
                            maxLon: row.maxLon,
                            minHMean: row.minHMean,
                            maxHMean: row.maxHMean,
                            lowHMean: row.perc10HMean,
                            highHMean: row.perc90HMean,
                            numPoints: row.numPoints
                        };
                        rows.push(typedRow);
                    }
                }

                if (rows.length > 0) {
                    const row = rows[0];
                    console.log('duckDbReadOrCacheSummary row:', row);
                    localExtLatLon.minLat = row.minLat;
                    localExtLatLon.maxLat = row.maxLat;
                    localExtLatLon.minLon = row.minLon;
                    localExtLatLon.maxLon = row.maxLon;
                    localExtHMean.minHMean = row.minHMean;
                    localExtHMean.maxHMean = row.maxHMean;
                    localExtHMean.lowHMean = row.lowHMean;
                    localExtHMean.highHMean = row.highHMean;
                    numPoints = row.numPoints;
                    await indexedDb.addNewSummary({ req_id: req_id, extLatLon: localExtLatLon, extHMean: localExtHMean, numPoints: numPoints });
                    await indexedDb.updateRequestRecord( {req_id:req_id, cnt:numPoints});

                    if(numPoints <= 0){
                        console.warn('No points returned: numPoints is zero');
                    }
                } else {
                    console.error('No rows returned');
                    throw new Error('No rows returned');
                }
                return await indexedDb.getWorkerSummary(req_id);
            } catch (error) {
                console.error('duckDbReadOrCacheSummary error:', error);
                throw error;
            }
        }
    } catch (error) {
        console.error('duckDbReadOrCacheSummary error:', error);
        throw error;
    } finally {
        unlock();
    }
}

export const duckDbReadAndUpdateElevationData = async (req_id: number, maxNumPnts=100000, chunkSize:number=100000) => {
    console.log('duckDbReadAndUpdateElevationData req_id:', req_id);
    let srViewName = await indexedDb.getSrViewName(req_id);
    if((!srViewName) || (srViewName == '') || (srViewName === 'Global')){
        srViewName = 'Global Mercator Esri';
        console.error(`HACK ALERT!! inserting srViewName:${srViewName} for reqId:${req_id}`);
    }
    const projName = srViews.value[srViewName].projectionName;
    if(req_id === undefined || req_id === null || req_id === 0){
        console.error('duckDbReadAndUpdateElevationData Bad req_id:', req_id);
        return;
    }
    const startTime = performance.now(); // Start time

    try {
        if (await indexedDb.getStatus(req_id) === 'error') {
            console.error('duckDbReadAndUpdateElevationData req_id:', req_id, ' status is error SKIPPING!');
            //removeCurrentDeckLayer();
            return;
        }

        useAtlChartFilterStore().setReqId(req_id);
        const height_fieldname = await getHeightFieldname(req_id);

        const summary = await duckDbReadOrCacheSummary(req_id, height_fieldname);

        if (summary && summary.numPoints) {
            useCurReqSumStore().setSummary(summary);
            //console.log ('duckDbReadAndUpdateElevationData typeof(summary.numPoints):', typeof(summary.numPoints));
            let sample_fraction = 1.0;
            const numPointsStr = summary.numPoints;
            const numPoints = parseInt(String(numPointsStr));
            // console.log ('duckDbReadAndUpdateElevationData typeof numPoints:', typeof(numPoints));
            // console.log(`numPoints: ${numPoints}, Type: ${typeof numPoints}`);

            try{
                sample_fraction = maxNumPnts /numPoints; 
            } catch (error) {
                console.error('duckDbReadAndUpdateElevationData sample_fraction error:', error);
            }
            console.warn('duckDbReadAndUpdateElevationData maxNumPnts:', maxNumPnts, ' summary.numPoints:', summary.numPoints, ' numPoints:',numPoints, ' sample_fraction:', sample_fraction);
                        // Step 1: Initialize the DuckDB client
            const duckDbClient = await createDuckDbClient();

            // Step 2: Retrieve the filename using req_id
            const filename = await indexedDb.getFilename(req_id);

            // Step 3: Register the Parquet file with DuckDB
            await duckDbClient.insertOpfsParquet(filename);
            //const server_req = await duckDbClient.getServerReqFromMetaData(filename);
            //console.log('duckDbReadAndUpdateElevationData server_req:', server_req);
            // Step 4: Execute a SQL query to retrieve the elevation data
            //console.log(`duckDbReadAndUpdateElevationData for req:${req_id} PRE Query took ${performance.now() - startTime} milliseconds.`);

            // Calculate the offset for the query
            let offset = 0;
            let hasMoreData = true;
            let numDataItemsUsed = 0;
            let numDataItemsProcessed = 0;
            const rowChunks: ElevationDataItem[] = [];
            useMapStore().setCurrentRows(0);
            useMapStore().setTotalRows(0);
        
            while (hasMoreData) {
                try{
                    // Execute the query
                    const result = await duckDbClient.queryChunkSampled(`SELECT * FROM '${filename}'`, 
                                                                        chunkSize, 
                                                                        offset,
                                                                        sample_fraction);
                    if(result.totalRows){
                        //console.log('duckDbReadAndUpdateElevationData totalRows:', result.totalRows);
                        useMapStore().setTotalRows(result.totalRows);
                    } else {
                        if(result.schema === undefined){
                            console.warn('duckDbReadAndUpdateElevationData totalRows and schema are undefined result:', result);
                        }
                    }
                    //console.log(`duckDbReadAndUpdateElevationData for ${req_id} offset:${offset} POST Query took ${performance.now() - startTime} milliseconds.`);
                    for await (const rowChunk of result.readRows()) {
                        if (rowChunk.length > 0) {
                            if (numDataItemsUsed === 0) {
                                // Assuming we only need to set field names once, during the first chunk processing
                                const fieldNames = Object.keys(rowChunk[0]);
                                await useAtlChartFilterStore().setElevationDataOptionsFromFieldNames(fieldNames);
                            }
                    
                            // Use the sample rate to push every nth element
                            for (let i = 0; i < rowChunk.length; i++) {
                                rowChunks.push(rowChunk[i]);
                            }
                    
                            // Update the count of processed data items
                            numDataItemsUsed += rowChunk.length;
                            useMapStore().setCurrentRows(numDataItemsUsed);
                            numDataItemsProcessed += chunkSize;
                            //console.log('duckDbReadAndUpdateElevationData numDataItemsUsed:', numDataItemsUsed, ' numDataItemsProcessed:', numDataItemsProcessed);
                        }
                    }
                    
                    if (numDataItemsUsed === 0) {
                        console.warn('duckDbReadAndUpdateElevationData no data items processed');
                        useSrToastStore().warn('No Data Processed','No data items processed. Not Data returned for this region and request parameters.');
                    } else {
                        //console.log('duckDbReadAndUpdateElevationData numDataItems:', numDataItems);
                    }
                    hasMoreData = result.hasMoreData;
                    if(numDataItemsUsed >= maxNumPnts){
                        console.warn('duckDbReadAndUpdateElevationData EXCEEDED maxNumPnts:', maxNumPnts,' numDataItemsUsed:',numDataItemsUsed, 'numDataItemsProcessed:',numDataItemsProcessed, ' SKIPPING rest of file!');
                        hasMoreData = false;
                    }
                    offset += chunkSize;
                } catch (error) {
                    console.error('duckDbReadAndUpdateElevationData error processing chunk:', error);
                    hasMoreData = false;
                    throw error;
                }
            }
            updateElLayerWithObject(rowChunks as ElevationDataItem[], summary.extHMean, height_fieldname, projName);
        } else {
            if(summary === undefined){
                console.error('duckDbReadAndUpdateElevationData summary is undefined');
                throw new Error('duckDbReadAndUpdateElevationData summary is undefined');
            }
            if (summary && summary.numPoints === 0) {
                console.warn('duckDbReadAndUpdateElevationData summary.numPoints is 0');
                throw new Error('duckDbReadAndUpdateElevationData summary.numPoints is 0');
            }
        }
    } catch (error) {
        console.error('duckDbReadAndUpdateElevationData error:', error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        console.log(`duckDbReadAndUpdateElevationData for ${req_id} took ${endTime - startTime} milliseconds. endTime:${endTime}`);
    }
};

export const duckDbReadAndUpdateSelectedLayer = async (req_id: number, chunkSize:number=100000, maxNumPnts=1000000) => {
    //console.log('duckDbReadAndUpdateElevationData req_id:', req_id);
    if(req_id === undefined || req_id === null || req_id === 0){
        console.error('duckDbReadAndUpdateSelectedLayer Bad req_id:', req_id);
        return;
    }
    const startTime = performance.now(); // Start time

    try {
        if (await indexedDb.getStatus(req_id) === 'error') {
            console.error('duckDbReadAndUpdateSelectedLayer req_id:', req_id, ' status is error SKIPPING!');
            return;
        }

        useAtlChartFilterStore().setReqId(req_id);
        // Step 1: Initialize the DuckDB client
        const duckDbClient = await createDuckDbClient();

        // Step 2: Retrieve the filename and func using req_id
        const filename = await indexedDb.getFilename(req_id);
        const func = await indexedDb.getFunc(req_id);
        let queryStr = `SELECT * FROM '${filename}'`;
        const rgts = useAtlChartFilterStore().getRgtValues();
        const cycles = useAtlChartFilterStore().getCycleValues(); 
        if(func.includes('atl06')){
            const spots = useAtlChartFilterStore().getSpotValues();
            //console.log('duckDbReadAndUpdateSelectedLayer beams:', beams);
            queryStr = `
                        SELECT * FROM '${filename}' 
                        WHERE rgt IN (${rgts.join(', ')}) 
                        AND cycle IN (${cycles.join(', ')})
                        AND spot IN (${spots.join(', ')})
                        `
        } else if(func === 'atl03sp'){
            //console.log('duckDbReadAndUpdateSelectedLayer tracks:', tracks);            
            queryStr = `SELECT * FROM '${filename}' `;
            queryStr += useAtlChartFilterStore().getAtl03spWhereClause();
        } else if(func.includes('atl03vp')){
            const spots = useAtlChartFilterStore().getSpotValues();
            //console.log('duckDbReadAndUpdateSelectedLayer beams:', beams);
            queryStr = `
                        SELECT * FROM '${filename}' 
                        WHERE rgt IN (${rgts.join(', ')}) 
                        AND cycle IN (${cycles.join(', ')})
                        AND spot IN (${spots.join(', ')})
                        `
        } else if(func.includes('atl08')){
            const spots = useAtlChartFilterStore().getSpotValues();
            //console.log('duckDbReadAndUpdateSelectedLayer beams:', beams);
            queryStr = `
                        SELECT * FROM '${filename}' 
                        WHERE rgt IN (${rgts.join(', ')}) 
                        AND cycle IN (${cycles.join(', ')})
                        AND spot IN (${spots.join(', ')})
                        `
        } else {
            console.error('duckDbReadAndUpdateSelectedLayer invalid func:', func);
        }
        // Step 3: Register the Parquet file with DuckDB
        await duckDbClient.insertOpfsParquet(filename);

        // Step 4: Execute a SQL query to retrieve the elevation data
        //console.log(`duckDbReadAndUpdateSelectedLayer for req:${req_id} PRE Query took ${performance.now() - startTime} milliseconds.`);
        console.log('duckDbReadAndUpdateSelectedLayer queryStr:', queryStr);
        // Calculate the offset for the query
        let offset = 0;
        let hasMoreData = true;
        let numDataItems = 0;
        const rowChunks: ElevationDataItem[] = [];

        while (hasMoreData) {
            try{
                // Execute the query
                //console.log('duckDbReadAndUpdateSelectedLayer queryStr:', queryStr);
                const result = await duckDbClient.queryChunkSampled(queryStr, chunkSize, offset);
                //console.log(`duckDbReadAndUpdateSelectedLayer for ${req_id} offset:${offset} POST Query took ${performance.now() - startTime} milliseconds.`);
                for await (const rowChunk of result.readRows()) {
                    //console.log('duckDbReadAndUpdateSelectedLayer chunk.length:', rowChunk.length);
                    if (rowChunk.length > 0) {
                        numDataItems += rowChunk.length;
                        rowChunks.push(...rowChunk);
                        // Read and process each chunk from the QueryResult
                        //console.log('duckDbReadAndUpdateSelectedLayer rowChunks:', rowChunks);
                    }
                }

                if (numDataItems === 0) {
                    console.warn('duckDbReadAndUpdateSelectedLayer no data items processed');
                } else {
                    //console.log('duckDbReadAndUpdateSelectedLayer numDataItems:', numDataItems);
                }
                hasMoreData = result.hasMoreData;
                if(numDataItems >= maxNumPnts){
                    console.warn('duckDbReadAndUpdateSelectedLayer EXCEEDED maxNumPnts:', maxNumPnts, ' SKIPPING rest of file!');
                    hasMoreData = false;
                }
                offset += chunkSize;
            } catch (error) {
                console.error('duckDbReadAndUpdateSelectedLayer error processing chunk:', error);
                hasMoreData = false;
                throw error;
            }
        }
        const srViewName = await indexedDb.getSrViewName(req_id);
        const projName = srViews.value[srViewName].projectionName;
        updateSelectedLayerWithObject(rowChunks as ElevationDataItem[], projName);
 
    } catch (error) {
        console.error('duckDbReadAndUpdateSelectedLayer error:', error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        console.log(`duckDbReadAndUpdateSelectedLayer for ${req_id} took ${endTime - startTime} milliseconds. endTime:${endTime}`);
    }
};


export async function duckDbLoadOpfsParquetFile(fileName: string): Promise<any> {
    const startTime = performance.now(); // Start time
    let serverReq = '';
    try{
        //console.log('duckDbLoadOpfsParquetFile');
        const duckDbClient = await createDuckDbClient();
        await duckDbClient.insertOpfsParquet(fileName);
        try {
            const serverReqResult =  await duckDbClient.getServerReqFromMetaData(fileName);
            if(serverReqResult){
                serverReq = serverReqResult;
            }
        } catch (error) {
            console.error('Error dumping parquet metadata:', error);
        }
    } catch (error) {
        console.error('duckDbLoadOpfsParquetFile error:',error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        console.log(`duckDbLoadOpfsParquetFile took ${endTime - startTime} milliseconds.`);
    }
    return serverReq;   
}

export interface SrScatterChartData { value: number[] };

async function fetchAtl03spScatterData(
    fileName: string, 
    x: string, 
    y: string[], 
) {
    //console.log('fetchAtl03spScatterData fileName:', fileName, ' x:', x, ' y:', y);
    const duckDbClient = await createDuckDbClient();
    const chartData: { [key: string]: SrScatterChartData[] } = {};
    const minMaxValues: { [key: string]: { min: number, max: number } } = {};
    const whereClause = useAtlChartFilterStore().getAtl03spWhereClause();

    if(whereClause){
        try {

            let query2 = `
                SELECT 
                    MIN(${x}) as min_x,
                    MAX(${x}) as max_x,
                    MIN(segment_dist) as min_segment_dist,
                    MAX(segment_dist) as max_segment_dist,
                    ${y.map(yName => `MIN(${yName}) as min_${yName}, MAX(${yName}) as max_${yName}`).join(", ")}
                FROM '${fileName}'
                `;
            query2 += whereClause;

            const queryResult2: QueryResult = await duckDbClient.query(query2);
            for await (const rowChunk of queryResult2.readRows()) {
                for (const row of rowChunk) {
                    if (row) {
                        useAtlChartFilterStore().setMinX(0);
                        useAtlChartFilterStore().setMaxX(row.max_x+row.max_segment_dist-row.min_segment_dist-row.min_x);
                        minMaxValues['segment_dist'] = {min: row[`min_segment_dist`], max: row[`max_segment_dist`]};
                        y.forEach((yName) => {
                            minMaxValues[yName] = { min: row[`min_${yName}`], max: row[`max_${yName}`] };
                        });
                    } else {
                        console.warn('fetchAtl03spScatterData fetchData rowData is null');
                    }
                }
            }
            //console.log('fetchAtl03spScatterData minMaxValues:', minMaxValues);
            const yColumns = y.join(", ");
            console.log('fetchAtl03spScatterData yColumns:', yColumns);
            let query = `
                SELECT 
                    ${x},
                    segment_dist, 
                    atl03_cnf,
                    atl08_class,
                    yapc_score,
                    ${yColumns},
                FROM '${fileName}'
                `;
            query += whereClause;

            useAtlChartFilterStore().setAtl03QuerySql(query);
            const queryResult: QueryResult = await duckDbClient.query(useAtlChartFilterStore().getAtl03QuerySql());
            for await (const rowChunk of queryResult.readRows()) {
                for (const row of rowChunk) {
                    if (row) {
                        y.forEach((yName) => {
                            if (!chartData[yName]) {
                                chartData[yName] = [];
                            }
                            const dataPoint = { value: [row[x]+row['segment_dist']-minMaxValues['segment_dist'].min, row[yName]] };
            
                            if (yName === 'height') {
                                dataPoint.value.push(row['atl03_cnf'], row['atl08_class'], row['yapc_score']);
                            }
            
                            chartData[yName].push(dataPoint);
                        });
                    } else {
                        console.warn('fetchAtl03spScatterData - fetchData rowData is null');
                    }
                }
            }
            
            return { chartData, minMaxValues };
        } catch (error) {
            console.error('fetchAtl03spScatterData fetchData Error fetching data:', error);
            return { chartData: {}, minMaxValues: {} };
        }
    } else {
        console.log('fetchAtl03spScatterData whereClause is undefined');
        return { chartData: {}, minMaxValues: {} };
    }
}


async function fetchAtl03vpScatterData(
    fileName: string, 
    x: string, 
    y: string[], 
): Promise<{ chartData: { [key: string]: SrScatterChartData[] }, normalizedMinMaxValues: { [key: string]: { min: number, max: number } }}> {
    //console.log('fetchAtl03vpScatterData fileName:', fileName, ' x:', x, ' y:', y);
    const duckDbClient = await createDuckDbClient();
    const chartData: { [key: string]: SrScatterChartData[] } = {};
    const minMaxValues: { [key: string]: { min: number, max: number } } = {};
    let normalizedMinMaxValues: { [key: string]: { min: number, max: number } } = {};
    const whereClause = useAtlChartFilterStore().getAtl03vpWhereClause();

    if(whereClause){
        try {

            let query2 = `
                SELECT 
                    MIN(${x}) as min_x,
                    MAX(${x}) as max_x,
                    ${y.map(yName => `MIN(${yName}) as min_${yName}, MAX(${yName}) as max_${yName}`).join(", ")}
                FROM '${fileName}'
                `;
            query2 += whereClause;

            const queryResult2: QueryResult = await duckDbClient.query(query2);
            for await (const rowChunk of queryResult2.readRows()) {
                for (const row of rowChunk) {
                    if (row) {
                        useAtlChartFilterStore().setMinX(0);
                        useAtlChartFilterStore().setMaxX(row.max_x-row.min_x);
                        minMaxValues['x'] = {min: row[`min_x`], max: row[`max_x`]};
                        y.forEach((yName) => {
                            minMaxValues[yName] = { min: row[`min_${yName}`], max: row[`max_${yName}`] };
                        });
                    } else {
                        console.warn('fetchAtl03vpScatterData fetchData rowData is null');
                    }
                }
            }
            //console.log('fetchAtl03vpScatterData minMaxValues:', minMaxValues);
            const yColumns = y.join(", ");
            //console.log('fetchAtl03vpScatterData yColumns:', yColumns);
            let query = `
                SELECT 
                    ${x},
                    ${yColumns},
                FROM '${fileName}'
                `;
            query += whereClause;

            useAtlChartFilterStore().setAtl03QuerySql(query);
            //console.log('fetchAtl03vpScatterData query:', useAtlChartFilterStore().getAtl03QuerySql());
            //console.log('fetchAtl03vpScatterData minMaxValues:', minMaxValues);
            const queryResult: QueryResult = await duckDbClient.query(useAtlChartFilterStore().getAtl03QuerySql());
            for await (const rowChunk of queryResult.readRows()) {
                for (const row of rowChunk) {
                    if (row) {
                        y.forEach((yName) => {
                            if (!chartData[yName]) {
                                chartData[yName] = [];
                            }
                            const dataPoint = { value: [row[x]-minMaxValues['x'].min, row[yName]] };
            
                            if (yName === 'segment_ph_cnt') {
                                dataPoint.value.push(row['segment_dist_x']);
                            }
            
                            chartData[yName].push(dataPoint);
                        });
                    } else {
                        console.warn('fetchAtl03vpScatterData - fetchData rowData is null');
                    }
                }
            }
            normalizedMinMaxValues = {...minMaxValues};
            normalizedMinMaxValues['x'] = {min: 0, max: minMaxValues['x'].max-minMaxValues['x'].min};
        
            // console.log('fetchAtl03vpScatterData minMaxValues:', minMaxValues);
            // console.log('fetchAtl03vpScatterData normalizedMinMaxValues:', normalizedMinMaxValues);
            // console.log('fetchAtl03vpScatterData chartData:', chartData);
            useAtlChartFilterStore().setXLegend(`${x} (normalized) - Meters`);    
            return { chartData, normalizedMinMaxValues };
        } catch (error) {
            console.error('fetchAtl03vpScatterData fetchData Error fetching data:', error);
            return { chartData: {}, normalizedMinMaxValues: {} };
        }
    } else {
        console.log('fetchAtl03vpScatterData whereClause is undefined');
        return { chartData: {}, normalizedMinMaxValues: {} };
    }
}

export async function updateRgtOptions(req_id: number): Promise<number[]> {
    const startTime = performance.now(); // Start time
    const fileName = await indexedDb.getFilename(req_id);
    const duckDbClient = await createDuckDbClient();
    const rgts = [] as number[];
    try{
        const query = `SELECT DISTINCT rgt FROM '${fileName}' order by rgt ASC`;
        const queryResult: QueryResult = await duckDbClient.query(query);
        for await (const rowChunk of queryResult.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    //console.log('getRgt row:', row);
                    rgts.push(row.rgt);
                } else {
                    console.warn('getRgts fetchData rowData is null');
                }
            }
        } 
        useAtlChartFilterStore().setRgtOptionsWithNumbers(rgts);   
    } catch (error) {
        console.error('getRgt Error:', error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        console.log(`SrDuckDbUtils.getRgts() took ${endTime - startTime} milliseconds.`);
    }
    return rgts;
}

export async function getPairs(req_id: number): Promise<number[]> {
    const startTime = performance.now(); // Start time
    const fileName = await indexedDb.getFilename(req_id);
    const duckDbClient = await createDuckDbClient();
    const pairs = [] as number[];
    try{
        const query = `SELECT DISTINCT pair FROM '${fileName}' order by pair ASC`;
        const queryResult: QueryResult = await duckDbClient.query(query);
        for await (const rowChunk of queryResult.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    //console.log('getPairs row:', row);
                    pairs.push(row.pair);
                } else {
                    console.warn('getPairs fetchData rowData is null');
                }
            }
        } 
        //console.log('getPairs pairs:', pairs);
    } catch (error) {
        console.error('getPairs Error:', error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        console.log(`SrDuckDbUtils.getPairs() took ${endTime - startTime} milliseconds.`);
    }
    return pairs;
}

export async function updatePairOptions(req_id: number): Promise<number[]> {
    let pairs = [] as number[];
    try{
        pairs = await getPairs(req_id);
        useAtlChartFilterStore().setPairOptionsWithNumbers(pairs);   
    } catch (error) {
        console.error('getPairs Error:', error);
        throw error;
    }
    console.log('updatePairOptions pairs:', useAtlChartFilterStore().getPairOptions());
    return pairs;
}

export async function getTracks(req_id: number): Promise<number[]> {
    const startTime = performance.now(); // Start time
    const fileName = await indexedDb.getFilename(req_id);
    const duckDbClient = await createDuckDbClient();
    const tracks = [] as number[];
    try{
        const query = `SELECT DISTINCT track FROM '${fileName}' order by track ASC`;
        const queryResult: QueryResult = await duckDbClient.query(query);
        for await (const rowChunk of queryResult.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    //console.log('getPairs row:', row);
                    tracks.push(row.track);
                } else {
                    console.warn('getTracks fetchData rowData is null');
                }
            }
        } 
        //console.log('getPairs pairs:', pairs);
    } catch (error) {
        console.error('getTracks Error:', error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        console.log(`SrDuckDbUtils.getTracks() took ${endTime - startTime} milliseconds.`);
    }
    return tracks;
}

export async function updateTrackOptions(req_id: number): Promise<number[]> {
    let tracks = [] as number[];
    try{
        tracks = await getTracks(req_id);
        useAtlChartFilterStore().setTrackOptionsWithNumbers(tracks);   
    } catch (error) {
        console.error('getTracks Error:', error);
        throw error;
    }
    return tracks;
}
export async function getScOrient(req_id: number): Promise<number[]> {
    const startTime = performance.now(); // Start time
    const fileName = await indexedDb.getFilename(req_id);
    const duckDbClient = await createDuckDbClient();
    const scOrients = [] as number[];
    try{
        const query = `SELECT DISTINCT sc_orient FROM '${fileName}' order by sc_orient ASC`;
        const queryResult: QueryResult = await duckDbClient.query(query);
        for await (const rowChunk of queryResult.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    //console.log('getScOrient row:', row);
                    scOrients.push(row.sc_orient);
                } else {
                    console.warn('getScOrient fetchData rowData is null');
                }
            }
        } 
        //console.log('getScOrient scOrients:', scOrients);
    } catch (error) {
        console.error('getScOrient Error:', error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        console.log(`SrDuckDbUtils.getScOrient() took ${endTime - startTime} milliseconds.`);
    }
    return scOrients;
}

export async function updateScOrientOptions(req_id: number): Promise<number[]> {
    let scOrients = [] as number[];
    try{
        scOrients = await getScOrient(req_id);
        useAtlChartFilterStore().setScOrientOptionsWithNumbers(scOrients);   
    } catch (error) {
        console.error('getScOrient Error:', error);
        throw error;
    }
    return scOrients;
}

export async function updateCycleOptions(req_id: number): Promise<number[]> {
    const startTime = performance.now(); // Start time

    const fileName = await indexedDb.getFilename(req_id);
    const duckDbClient = await createDuckDbClient();
    const cycles = [] as number[];
    try{
        const query = `SELECT DISTINCT cycle FROM '${fileName}' order by cycle ASC`;
        const queryResult: QueryResult = await duckDbClient.query(query);
        for await (const rowChunk of queryResult.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    //console.log('getCycle row:', row);
                    cycles.push(row.cycle);
                } else {
                    console.warn('getCycles fetchData rowData is null');
                }
            }
        } 
        useAtlChartFilterStore().setCycleOptionsWithNumbers(cycles);   
        //console.log('updateCycleOptions cycles:', useAtlChartFilterStore().getCycleOptions());
    } catch (error) {
        console.error('updateCycleOptions Error:', error);
        throw error;
    } finally {
        const endTime = performance.now(); // End time
        //console.log(`SrDuckDbUtils.updateCycleOptions() took ${endTime - startTime} milliseconds.`);
    }
    return cycles;
}
async function fetchAtl06ScatterData(
        fileName: string, 
        x: string, 
        y: string[]
) : Promise<{ chartData: { [key: string]: SrScatterChartData[] }, normalizedMinMaxValues: { [key: string]: { min: number, max: number } }}> {
    const startTime = performance.now(); // Start time
    const duckDbClient = await createDuckDbClient();
    const chartData: { [key: string]: SrScatterChartData[] } = {};
    const minMaxValues: { [key: string]: { min: number, max: number } } = {};
    let normalizedMinMaxValues: { [key: string]: { min: number, max: number } } = {};
    let whereClause = useAtlChartFilterStore().getAtl06WhereClause();

    try {

        let query2 = `
            SELECT 
                MIN(${x}) as min_x,
                MAX(${x}) as max_x,
                ${y.map(yName => `MIN(${yName}) as min_${yName}, MAX(${yName}) as max_${yName}`).join(", ")}
            FROM '${fileName}'
        `;
        query2 += whereClause;
        //console.log('fetchAtl06ScatterData query2:', query2);
        const queryResult2: QueryResult = await duckDbClient.query(query2);
        //console.log('fetchAtl06ScatterData queryResult2:', queryResult2);
        for await (const rowChunk of queryResult2.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    useAtlChartFilterStore().setMinX(0);
                    useAtlChartFilterStore().setMaxX(row.max_x-row.min_x);
                    minMaxValues['x'] = {min: row[`min_x`], max: row[`max_x`]};
                    y.forEach((yName) => {
                        minMaxValues[yName] = { min: row[`min_${yName}`], max: row[`max_${yName}`] };
                    });
                } else {
                    console.warn('fetchAtl06ScatterData rowData is null');
                }
            }
        }
 
        const yColumns = y.join(", ");
        let query = `
            SELECT 
                ${x}, 
                ${yColumns}
            FROM '${fileName}'
            `;
        query += whereClause;
    
        useAtlChartFilterStore().setAtl06QuerySql(query);
        const queryResult: QueryResult = await duckDbClient.query(useAtlChartFilterStore().getAtl06QuerySql());
        for await (const rowChunk of queryResult.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    y.forEach((yName) => {
                        if (!chartData[yName]) {
                            chartData[yName] = [];
                        }
                        const dataPoint = { value: [row[x]-minMaxValues['x'].min, row[yName]] };
                        if (yName === 'h_mean') {
                            dataPoint.value.push(row['x_atc']); // to show in tooltip
                        }
                        chartData[yName].push(dataPoint);
                    });
                } else {
                    console.warn('fetchAtl06ScatterData rowData is null');
                }
            }
        }
        // normalize the minMaxValues x to start at 0
        normalizedMinMaxValues = {...minMaxValues};
        normalizedMinMaxValues['x'] = {min: 0, max: minMaxValues['x'].max-minMaxValues['x'].min};
        //console.log('fetchAtl06ScatterData minMaxValues:', minMaxValues);
        //console.log('fetchAtl06ScatterData normalizedMinMaxValues:', normalizedMinMaxValues);
        //console.log('fetchAtl06ScatterData chartData:', chartData);
        useAtlChartFilterStore().setXLegend(`${x} (normalized) - Meters`);    
        return { chartData, normalizedMinMaxValues };
    } catch (error) {
        console.error('fetchAtl06ScatterData Error fetching data:', error);
        return { chartData: {}, normalizedMinMaxValues: {} };
    } finally {
        const endTime = performance.now(); // End time
        console.log(`fetchAtl06ScatterData took ${endTime - startTime} milliseconds.`);
    }
}

async function fetchAtl08ScatterData(
    fileName: string, 
    x: string, 
    y: string[]
): Promise<{ chartData: { [key: string]: SrScatterChartData[] }, normalizedMinMaxValues: { [key: string]: { min: number, max: number } }}>  {
    const startTime = performance.now(); // Start time
    const duckDbClient = await createDuckDbClient();
    const chartData: { [key: string]: SrScatterChartData[] } = {};
    const minMaxValues: { [key: string]: { min: number, max: number } } = {};
    let normalizedMinMaxValues: { [key: string]: { min: number, max: number } } = {};
    const whereClause = useAtlChartFilterStore().getAtl08pWhereClause();

    try {
        let query2 = `
            SELECT 
                MIN(${x}) as min_x,
                MAX(${x}) as max_x,
                ${y.map(yName => `MIN(${yName}) as min_${yName}, MAX(${yName}) as max_${yName}`).join(", ")}
            FROM '${fileName}'
        `;
        query2 += whereClause;
        //console.log('fetchAtl06ScatterData query2:', query2);
        const queryResult2: QueryResult = await duckDbClient.query(query2);
        //console.log('fetchAtl06ScatterData queryResult2:', queryResult2);
        for await (const rowChunk of queryResult2.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    useAtlChartFilterStore().setMinX(0);
                    useAtlChartFilterStore().setMaxX(row.max_x-row.min_x);
                    minMaxValues['x'] = {min: row[`min_x`], max: row[`max_x`]};
                    y.forEach((yName) => {
                        minMaxValues[yName] = { min: row[`min_${yName}`], max: row[`max_${yName}`] };
                    });
                } else {
                    console.warn('fetchAtl08ScatterData rowData is null');
                }
            }
        }

        const yColumns = y.join(", ");
        let query = `
            SELECT 
                ${x}, 
                ${yColumns}
            FROM '${fileName}'
            `;
        query += whereClause;
        useAtlChartFilterStore().setAtl08QuerySql(query);
        const queryResult: QueryResult = await duckDbClient.query(useAtlChartFilterStore().getAtl08QuerySql());
        for await (const rowChunk of queryResult.readRows()) {
            for (const row of rowChunk) {
                if (row) {
                    y.forEach((yName) => {
                        if (!chartData[yName]) {
                            chartData[yName] = [];
                        }
                        // normalize the x axis to start at 0
                        const dataPoint = { value: [row[x]-minMaxValues['x'].min, row[yName]] };
                        if (yName === 'h_mean_canopy') {
                            dataPoint.value.push(row['x_atc']); // to show in tooltip
                        }
                        chartData[yName].push(dataPoint);
                        });
                } else {
                    console.warn('fetchAtl08ScatterData rowData is null');
                }
            }
        }
        // normalize the minMaxValues x to start at 0
        normalizedMinMaxValues = {...minMaxValues};
        normalizedMinMaxValues['x'] = {min: 0, max: minMaxValues['x'].max-minMaxValues['x'].min};
        //console.log('fetchAtl08ScatterData minMaxValues:', minMaxValues);
        //console.log('fetchAtl08ScatterData normalizedMinMaxValues:', normalizedMinMaxValues);
        //console.log('fetchAtl08ScatterData chartData:', chartData);
        useAtlChartFilterStore().setXLegend(`${x} (normalized) - Meters`);    
        return { chartData, normalizedMinMaxValues };
    } catch (error) {
        console.error('fetchAtl08ScatterData Error fetching data:', error);
        return { chartData: {}, normalizedMinMaxValues: {} };
    } finally {
        const endTime = performance.now(); // End time
        console.log(`fetchAtl08ScatterData took ${endTime - startTime} milliseconds.`);
    }
}

interface SrScatterSeriesData{
    series: {
        name: string;
        type: string;
        data: number[][];
        large: boolean;
        largeThreshold: number;
        animation: boolean;
        yAxisIndex: number;
        symbolSize?: number;
    };
    min: number;
    max: number;
};

let debugCnt = 0;
function getAtl03spColor(params: any):string {
    if(debugCnt++ < 10){
        console.log('getAtl03spColor Atl03ColorKey:', useAtl03ColorMapStore().getAtl03ColorKey());
        console.log('getAtl03spColor params.data:', params.data);
    }
    let colorStr = 'red';
    let value = -1;
    if(useAtl03ColorMapStore().getAtl03ColorKey() === 'atl03_cnf'){ 
        value = params.data[2];
        colorStr = useAtl03ColorMapStore().getColorForAtl03CnfValue(value);
    } else if(useAtl03ColorMapStore().getAtl03ColorKey() === 'atl08_class'){
        value = params.data[3];
        colorStr = useAtl03ColorMapStore().getColorForAtl08ClassValue(value);
    } else if(useAtl03ColorMapStore().getAtl03ColorKey() === 'YAPC'){ 
        value = params.data[4];
        const color = useAtl03ColorMapStore().getYapcColorForValue(value,0,255);
        colorStr = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
    }
    if(debugCnt++ < 10){
        console.log(`getAtl03spColor cnt:${debugCnt} value:${value} colorStr:${colorStr}`);
    }
    return colorStr;
}

async function getSeriesForAtl03sp(fileName: string, x: string, y: string[]): Promise<SrScatterSeriesData[]> {
    //console.log('getSeriesForAtl03 fileName:', fileName, ' x:', x, ' y:', y);
    const startTime = performance.now(); // Start time
    let yItems = [] as SrScatterSeriesData[];

    try {
        const name = 'Atl03sp';
        const { chartData = {}, minMaxValues = {} } = await fetchAtl03spScatterData(fileName, x, y);
        //console.log('getSeriesForAtl03sp chartData:', chartData, ' minMaxValues:', minMaxValues);
        // Check if either chartData or minMaxValues is empty
        if (Object.keys(chartData).length === 0 || Object.keys(minMaxValues).length === 0) {
            console.warn('getSeriesForAtl03sp chartData or minMaxValues is empty, skipping processing.');
            return yItems; // Return empty array if either is empty
        }

        yItems = y.map(yName => {
            const data = chartData[yName] ? chartData[yName].map(item => item.value) : [];
            const min = minMaxValues[yName]?.min ?? null; // Default to null if minMaxValues[yName] or min is undefined
            const max = minMaxValues[yName]?.max ?? null; // Default to null if minMaxValues[yName] or max is undefined

            return {
                series: {
                    name: `${name} - ${yName}`,
                    type: 'scatter',
                    data: data,
                    itemStyle: {
                        color: getAtl03spColor,
                    },
                    large: useAtlChartFilterStore().getLargeData(),
                    largeThreshold: useAtlChartFilterStore().getLargeDataThreshold(),
                    animation: false,
                    yAxisIndex: y.indexOf(yName), // Set yAxisIndex to map each series to its respective yAxis
                    symbolSize: useAtlChartFilterStore().getSymbolSize(),
                },
                min: min,
                max: max
            };
        });
        // Log the total number of points across all series
        const totalPoints = yItems.reduce((sum, series) => sum + series.series.data.length, 0);
        useAtlChartFilterStore().setNumOfPlottedPnts(totalPoints);
        //console.log(`Total number of points across all series: ${totalPoints}`);

    } catch (error) {
        console.error('getSeriesForAtl03sp Error:', error);
    } finally {
        const endTime = performance.now(); // End time
        console.log(`getSeriesForAtl03sp took ${endTime - startTime} milliseconds.`);
    }

    return yItems;
}


async function getSeriesForAtl03vp(
    fileName: string, 
    x: string, 
    y: string[]
): Promise<SrScatterSeriesData[]> {
    //console.log('getSeriesForAtl03vp fileName:', fileName, ' x:', x, ' y:', y);
    const startTime = performance.now(); // Start time
    let yItems = [] as SrScatterSeriesData[];

    try {
        const name = 'Atl03vp';
        const { chartData = {}, normalizedMinMaxValues = {} } = await fetchAtl03vpScatterData(fileName, x, y);
        //console.log('getSeriesForAtl03vp chartData:', chartData);
        //console.log('getSeriesForAtl03vp minMaxValues:', normalizedMinMaxValues);

        // Check if either chartData or normalizedMinMaxValues is empty
        if (Object.keys(chartData).length === 0 || Object.keys(normalizedMinMaxValues).length === 0) {
            console.warn('getSeriesForAtl03vp chartData or minMaxValues is empty, skipping processing.');
            return yItems; // Return empty array if either is empty
        }

        yItems = y.map(yName => {
            const data = chartData[yName] ? chartData[yName].map(item => item.value) : [];
            const min = normalizedMinMaxValues[yName]?.min ?? null; // Default to null if minMaxValues[yName] or min is undefined
            const max = normalizedMinMaxValues[yName]?.max ?? null; // Default to null if minMaxValues[yName] or max is undefined
            //console.log('getSeriesForAtl03vp data:', data);
            //console.log('getSeriesForAtl03vp min:', min, ' max:', max);
            return {
                series: {
                    name: `${name} - ${yName}`,
                    type: 'scatter',
                    data: data,
                    large: useAtlChartFilterStore().getLargeData(),
                    largeThreshold: useAtlChartFilterStore().getLargeDataThreshold(),
                    animation: false,
                    yAxisIndex: y.indexOf(yName), // Set yAxisIndex to map each series to its respective yAxis
                    symbolSize: useAtlChartFilterStore().getSymbolSize(),
                },
                min: min,
                max: max
            };
        });
        // Log the total number of points across all series
        const totalPoints = yItems.reduce((sum, series) => sum + series.series.data.length, 0);
        useAtlChartFilterStore().setNumOfPlottedPnts(totalPoints);
        //console.log(`Total number of points across all series: ${totalPoints}`);

    } catch (error) {
        console.error('getSeriesForAtl03vp Error:', error);
    } finally {
        const endTime = performance.now(); // End time
        console.log(`getSeriesForAtl03vp took ${endTime - startTime} milliseconds.`);
    }

    return yItems;
}


async function getSeriesForAtl06( 
    fileName: string, 
    x: string, 
    y: string[]
): Promise<SrScatterSeriesData[]> {
    //console.log('getSeriesForAtl06 fileName:', fileName, ' x:', x, ' y:', y, ' spots:', spots, ' rgt:', rgt, ' cycle:', cycle);
    const startTime = performance.now();
    let yItems=[] as SrScatterSeriesData[];

    try{
        const name = 'Atl06';
        const { chartData = {} , normalizedMinMaxValues = {} } = await fetchAtl06ScatterData(fileName, x, y);
        //console.log('getSeriesForAtl06 chartData:', chartData);
        //console.log('getSeriesForAtl06 minMaxValues:', normalizedMinMaxValues);
        // Check if either chartData or minMaxValues is empty
        if (Object.keys(chartData).length === 0 || Object.keys(normalizedMinMaxValues).length === 0) {
            console.warn('getSeriesForAtl06 chartData or minMaxValues is empty, skipping processing.');
            return yItems; // Return empty array if either is empty
        }
        yItems = y.map(yName => {
            const data = chartData[yName] ? chartData[yName].map(item => item.value) : [];
            const min = normalizedMinMaxValues[yName]?.min ?? null; // Default to null if minMaxValues[yName] or min is undefined
            const max = normalizedMinMaxValues[yName]?.max ?? null; // Default to null if minMaxValues[yName] or max is undefined
            //console.log('getSeriesForAtl06 data:', data);
            //console.log('getSeriesForAtl06 min:', min, ' max:', max);
            return {
                series: {
                    name: `${name} - ${yName}`,
                    type: 'scatter',
                    data: data,
                    large: useAtlChartFilterStore().getLargeData(),
                    largeThreshold: useAtlChartFilterStore().getLargeDataThreshold(),
                    animation: false,
                    yAxisIndex: y.indexOf(yName), // Set yAxisIndex to map each series to its respective yAxis
                    symbolSize: useAtlChartFilterStore().getSymbolSize(),
                },
                min: min,
                max: max
            };
        });
        const totalPoints = yItems.reduce((sum, series) => sum + series.series.data.length, 0);
        useAtlChartFilterStore().setNumOfPlottedPnts(totalPoints);
        //console.log(`Total number of points across all series: ${totalPoints}`);
    } catch (error) {
        console.error('getSeriesForAtl06 Error:', error);
    } finally {
        const endTime = performance.now(); // End time
        console.log(`getSeriesForAtl06 took ${endTime - startTime} milliseconds.`);
    }
    console.log('getSeriesForAtl06 yItems:', yItems);
    return yItems;
}

async function getSeriesForAtl08( fileName: string, x: string, y: string[]): Promise<SrScatterSeriesData[]> {
    console.log('getSeriesForAtl08 fileName:', fileName, ' x:', x, ' y:', y);
    const startTime = performance.now();
    let yItems=[] as SrScatterSeriesData[];
    try{
        const name = 'Atl08';
        const { chartData={}, normalizedMinMaxValues={} } = await fetchAtl08ScatterData(fileName, x, y);
        console.log('getSeriesForAtl08 chartData:', chartData, ' minMaxValues:', normalizedMinMaxValues);
        if (Object.keys(chartData).length === 0 || Object.keys(normalizedMinMaxValues).length === 0) {
            console.warn('getSeriesForAtl08 chartData or minMaxValues is empty, skipping processing.');
        } else {
            yItems = y.map(yName => ({
                name: `${name} - ${yName}`,
                type: 'scatter',
                data: chartData[yName] ? chartData[yName].map(item => item.value) : [],
                large: useAtlChartFilterStore().getLargeData(),
                largeThreshold: useAtlChartFilterStore().getLargeDataThreshold(),
                animation: false,
                yAxisIndex: y.indexOf(yName), // Set yAxisIndex to map each series to its respective yAxis
                symbolSize: useAtlChartFilterStore().getSymbolSize(),
            })).map((series, index) => ({
                series,
                min: normalizedMinMaxValues[y[index]].min,
                max: normalizedMinMaxValues[y[index]].max
            }));
        }
        const totalPoints = yItems.reduce((sum, series) => sum + series.series.data.length, 0);
        useAtlChartFilterStore().setNumOfPlottedPnts(totalPoints);
        console.log(`getSeriesForAtl08 Total number of points across all series: ${totalPoints}`);
        return yItems; // Return empty array if either is empty
    } catch (error) {
        console.error('getSeriesForAtl08 getSeriesForAtl08 Error:', error);
    } finally {
        const endTime = performance.now(); // End time
        console.log(`getSeriesForAtl08 took ${endTime - startTime} milliseconds.`);
    }

    return yItems;
}

export async function getScatterOptions(sop:SrScatterOptionsParms): Promise<any> {
    const startTime = performance.now(); // Start time
    //console.log('getScatterOptions sop:', sop);
    let options = null;
    try{
        let seriesData = [] as SrScatterSeriesData[];
        if(sop.fileName){
            if(sop.spots?.length && sop.rgts && sop.cycles){
                if(sop.func==='atl03sp'){
                    seriesData = await getSeriesForAtl03sp(sop.fileName, sop.x, sop.y);
                } else if(sop.func==='atl03vp'){
                    seriesData = await getSeriesForAtl03vp(sop.fileName, sop.x, sop.y);
                } else if(sop.func.includes('atl06')){
                    seriesData = await getSeriesForAtl06(sop.fileName, sop.x, sop.y);
                } else if(sop.func.includes('atl08')){
                    seriesData = await getSeriesForAtl08(sop.fileName, sop.x, sop.y);
                } else {
                    console.error('getScatterOptions invalid func:', sop.func);
                }
                console.log('getScatterOptions seriesData:', seriesData);
            } else {
                console.warn('getScatterOptions invalid? spots:', sop.spots, ' rgt:', sop.rgts, ' cycle:', sop.cycles);
            }
        } else {
            console.warn('getScatterOptions fileName is null');
        }
        if(seriesData.length !== 0){
            options = {
                title: {
                    text: `${sop.func}`,
                    left: "center"
                },
                tooltip: {
                    trigger: "item",
                    formatter: function (params:any) {
                        //console.warn('getScatterOptions params:', params);
                        if(sop.func === 'atl03sp'){
                            const [x, y, atl03_cnf, atl08_class, yapc_score] = params.value;
                            return `x: ${x}<br>y: ${y}<br>atl03_cnf: ${atl03_cnf}<br>atl08_class: ${atl08_class}<br>yapc_score: ${yapc_score}`;
                        } else {
                            const [x, y, x_actual] = params.value;
                            return `x: ${x}<br>y: ${y} <br>x_actual: ${x_actual}`;
                        }
                    }
                },
                legend: {
                    data: seriesData.map(series => series.series.name),
                    left: 'left'
                },
                notMerge: true,
                lazyUpdate: true,
                xAxis: {
                    min: useAtlChartFilterStore().getMinX(),
                    max: useAtlChartFilterStore().getMaxX(),
                    name: useAtlChartFilterStore().getXLegend(), // Add the label for the x-axis here
                    nameLocation: 'middle', // Position the label in the middle of the axis
                    nameTextStyle: {
                        fontSize: 10,
                        padding:[10,0,10,0],
                        margin:10,
                    }
                },
                yAxis: seriesData.map((series, index) => ({
                    type: 'value',
                    name: sop.y[index],
                    min: seriesData[index].min,
                    max: seriesData[index].max,
                    scale: true,  // Add this to ensure the axis scales correctly
                    axisLabel: {
                        formatter: (value: number) => value.toFixed(1)  // Format to one decimal place
                    }
                })),
                series: seriesData.map(series => series.series),
                dataZoom: [
                    {
                        type: 'slider', // This creates a slider to zoom in the X-axis
                        xAxisIndex: 0,
                        filterMode: 'none',
                        bottom: 1,
                    },
                    {
                        type: 'slider', // This creates a slider to zoom in the Y-axis
                        yAxisIndex: seriesData.length > 1 ? [0, 1] : 0, // Adjusting for multiple y-axes if necessary
                        filterMode: 'none',
                        left: '95%',
                        width: 20,
                    },
                    {
                        type: 'inside', // This allows zooming inside the chart using mouse wheel or touch gestures
                        xAxisIndex: 0,
                        filterMode: 'none',
                    },
                    {
                        type: 'inside', // This allows zooming inside the chart using mouse wheel or touch gestures
                        yAxisIndex: seriesData.length > 1 ? [0, 1] : 0,
                        filterMode: 'none',
                    },
                ],            
            };
        } else {
            console.warn('getScatterOptions seriesData is empty');
        }
        //console.log('getScatterOptions options:', options);
    } catch (error) {
        console.error('getScatterOptions Error:', error);
    } finally {
        const endTime = performance.now(); // End time
        console.log(`getScatterOptions fileName:${sop.fileName} took ${endTime - startTime} milliseconds.`);
    }
  return options;
}
