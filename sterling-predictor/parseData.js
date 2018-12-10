/**
 * General data munging functionality
 */

import * as d3 from 'd3';
import * as ss from 'simple-statistics';
import loadData from '@financial-times/load-data';

/**
 * Parses data file and returns structured data
 * @param  {String} url Path to CSV/TSV/JSON file
 * @return {Object}     Object containing series names, value extent and raw data object
 */
export function load([url, url2], options) { // eslint-disable-line

    return loadData([ // ... and with multiple files
        url,
        url2,
    ]).then(([result1, result2,]) => {
        const data = result1.data ? result1.data : result1;
        const data2 = result2.data ? result2.data : result2;

        const { dateFormat, highlightNames} = options; // eslint-disable-line no-unused-vars
        // make sure all the dates in the date column are a date object
        
        const parseDate = d3.timeParse(dateFormat);

        //makes sure moth datasets have correct date formats
        data.forEach((d) => {
            d.date = parseDate(d.date);
        });
        data2.forEach((d,i) => {
            d.date = new Date(d.projectiondate);
            d.projectiondate = new Date(d.projectiondate);
            d.reporteddate = new Date(d.reporteddate);
            d.projectionspot = getSpot(d);
            d.highlight = d.highlight;
            d.annotate = d.annotate;
        });

        //calculates the average when a range is given so a single point can be plotted on a line
        function getSpot(d) {
            // if(d.projectionlow) {
            //     console.log(d.projectionlow, d.projectionlow);
            //     return (Number(d.projectionlow) + Number(d.projectionhigh)) / 2
            // }
            return d.projectionspot
        }

        data2.sort((a, b) => a.date - b.date);
        let vertices = []

        //Pushes each prediction point and rane as a set of coordinates to the vertices array, this is so the concave hull can be calculated if theshaded area is wanted
        data2.forEach((d,i) => {
            if (d.projectionlow !== '') {
                    vertices.push([d.projectiondate, Number(d.projectionlow)])
                }
                if (d.projectionhigh !== '') {
                    vertices.push([d.projectiondate, Number(d.projectionhigh)])
                }
                if (d.projectionspot !== '') {
                    vertices.push([d.projectiondate, Number(d.projectionspot)])
                }

        });

        let seriesNames = getSeriesNames(data.columns);
        //get the names of unique each bank
        const predNames = data2.map( d => d.bank)
            .filter((item, pos, anoTypes) => anoTypes.indexOf(item) === pos);

        const dateExtent1 = d3.extent(data, d => d.date);
        const dateExtent2 = d3.extent(data2, d => d.date);
        const dateExtent = [Math.min(dateExtent1[0], dateExtent2[0]), Math.max(dateExtent1[1], dateExtent2[1])];    

        // Use the seriesNames array to calculate the minimum and max values in the dataset
        const valueExtent = extentMulti(data, seriesNames);

        const isLineHighlighted = (el) => highlightNames.some(d => d === el);

        // Format the dataset that is used to draw the lines
        let highlightLines = {};
        let plotData = seriesNames.map((d, i) => ({
            name: d,
            rangeData: [],
            lineData: getlines(data, d),
            highlightLine: isLineHighlighted(d),
        }));

        const predData = predNames.map((d) => {
            return {
                name: d,
                lineData: getPredLines(d),
                highlightLine: isLineHighlighted(d),
                rangeData: getRange(d)
            }
        })

        function getRange(d) {
            const banks = data2.filter(el => el.bank === d && el.projectionlow !== '')
            let rangeData = [];
             banks.forEach((bank) => {
                const column = {};
                column.name = bank.bank;
                column.date = Number(bank.projectiondate);
                column.low = Number(bank.projectionlow);
                column.high = Number(bank.projectionhigh);
                column.highlightLine = isLineHighlighted(bank.bank);
                if (bank) {
                    rangeData.push(column);
                }
            })
             return rangeData
        }

        function getPredLines(d) {
            const banks = data2.filter(el => el.bank === d)
            let lineData = [];
            banks.forEach((bank) => {
                const column = {};
                column.name = bank.bank;
                column.date = bank.projectiondate;
                column.value = +bank.projectionspot;
                column.highlight = isLineHighlighted(bank.bank);
                column.annotate = 'to come';
                if (bank.projectionspot) {
                // if (bank) {
                    lineData.push(column);
                }
            })
            return lineData
        }
        
        highlightLines = plotData.filter(d => d.highlightLine === true);
       
        // Format the data that is used to draw highlight tonal bands
        const boundaries = data2.filter(d => (d.highlight === 'begin' || d.highlight === 'end'));
        const highlights = [];

        boundaries.forEach((d, i) => {
            if (d.highlight === 'begin') {
                highlights.push({ begin: d.date, end: boundaries[i + 1].date });
            }
        });

        seriesNames = seriesNames.concat(predNames);
        // Adds Brexit datw
        const annos = {
            type: 'threshold',
            annotations: getAnnotations(),
        };

        function getAnnotations() {
            const types = [{
                    title: 'Brexit',
                    //note: '',
                    targetX: new Date('March 29, 2019 00:00:00'),
                    targetY: 1.5,
                    radius: 0,
                    type: 'threshold',
                },
                {
                    title: 'Deadline for comons vote',
                    //note: '',
                    targetX: new Date('January 21, 2019 00:00:00'),
                    targetY: 1.5,
                    radius: 0,
                    type: 'threshold',
                }]
            return types
        }


        return {
            data,
            vertices,
            seriesNames,
            plotData,
            predData,
            highlightLines,
            valueExtent,
            highlights,
            dateExtent,
            annos,
        };
    });
}


/**
 * Returns the columns headers from the top of the dataset, excluding specified
 * @param  {[type]} columns [description]
 * @return {[type]}         [description]
 */
export function getSeriesNames(columns) {
    const exclude = ['date', 'annotate', 'highlight','type'];
    return columns.filter(d => (exclude.indexOf(d) === -1));
}

/**
 * Calculates the extent of multiple columns
 * @param  {[type]} d       [description]
 * @param  {[type]} columns [description]
 * @param  {[type]} yMin    [description]
 * @return {[type]}         [description]
 */
export function extentMulti(d, columns, yMin) {
    const ext = d.reduce((acc, row) => {
        const values = columns.map(key => row[key])
        .map((item) => {
            if (!item || item === '*') {
                return yMin;
            }
            return Number(item);
        });
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
export function getlines(d, group) {
    // console.log('d and group',d,group)
    const lineData = [];
    d.forEach((el) => {
        // console.log(el,i)
        const column = {};
        column.name = group;
        column.date = el.date;
        column.value = +el[group];
        column.highlight = el.highlight;
        column.annotate = el.annotate;
        if (el[group]) {
            lineData.push(column);
        }

        // if(el[group] == false) {
        //     lineData.push(null)
        // }
        if (el[group] === false && joinPoints === false) {
            lineData.push(null);
        }
    });
    return lineData;
    // return d.map((el) => {
    //     if (el[group]) {
    //         return {
    //             name: group,
    //             date: el.date,
    //             value: +el[group],
    //             highlight: el.highlight,
    //             annotate: el.annotate,
    //         };
    //     }

    //     return null;
    // }).filter(i => i);
}
