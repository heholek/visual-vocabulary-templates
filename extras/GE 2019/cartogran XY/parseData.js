/**
 * General data munging functionality
 */

import * as d3 from 'd3';
import loadData from '@financial-times/load-data';

/**
 * Parses data file and returns structured data
 * @param  {String} url Path to CSV/TSV/JSON file
 * @return {Object}     Object containing series names, value extent and raw data object
 */
export function load(url, options) { // eslint-disable-line
    return loadData(url).then((result) => {
        const data = result.data ? result.data : result;
        const {dateFormat } = options; // eslint-disable-line no-unused-vars
        // make sure all the dates in the date column are a date object
        const parseDate = d3.timeParse(dateFormat);
        data.forEach((d) => {
            d.date = parseDate(d.date);
        });

        // Automatically calculate the seriesnames excluding the "marker" and "annotate column"
        const seriesNames = getSeriesNames(data.columns);
        console.log('seriesNames', seriesNames)

        // Use the seriesNames array to calculate the minimum and max values in the dataset
        const valueExtentY = extentMulti(data, ['y']);
        const valueExtentX = extentMulti(data, ['x']);
        console.log('valueExtent', valueExtentY, valueExtentX)

        let plotData = seriesNames.map((d) => {
            return {
                name: d,
                cartogram: getCarto(d)
            }
        })
        function getCarto(column) {
            let carto = data.map((el) => {
                return {
                    id: el.id,
                    name: el.name,
                    winner_par: el.winner_par,
                    geometry: el.geometry,
                    cent: el.cent,
                    x: el.x,
                    y: el.y,
                    value: el[column]
                }
            })
            return carto
        }
        console.log('plotData', plotData)

        // Format the dataset that is used to draw the lines

        return {
            data,
            seriesNames,
            valueExtentY,
            valueExtentX,
            plotData,
        };
    });
}


/**
 * Returns the columns headers from the top of the dataset, excluding specified
 * @param  {[type]} columns [description]
 * @return {[type]}         [description]
 */
export function getSeriesNames(columns) {
    const exclude = ['id', 'name', 'winner_par', 'geometry','cent', 'x', 'y'];
    return columns.filter(d => (exclude.indexOf(d) === -1));
}

function extentMulti(data, columns) {
    const ext = data.reduce((acc, row) => {
        const values = columns.map(key => +row[key]);
        const rowExtent = d3.extent(values);
        if (!acc.max) {
            acc.max = rowExtent[1];
            acc.min = rowExtent[0];
        } else {
            acc.max = Math.max(acc.max, rowExtent[1]);
            acc.min = Math.min(acc.min, rowExtent[0]);
        }
        return acc;
    }, {});
    return [ext.min, ext.max];
}

/**
 * Sorts the column information in the dataset into groups according to the column
 * head, so that the line path can be passed as one object to the drawing function
 */

