/**
 * General data munging functionality
 */

import * as d3 from 'd3';

/**
 * Parses CSV file and returns structured data
 * @param  {String} url Path to CSV file
 * @return {Object}     Object containing series names, value extent and raw data object
 */
export function fromCSV(url, dateStructure) {
    return new Promise((resolve, reject) => {
        d3.csv(url, (error, data) => {
            if (error) reject(error);
            else {
                // make sure all the dates in the date column are a date object
                const parseDate = d3.timeParse(dateStructure);
                data.forEach((d) => {
                    d.date = parseDate(d.date);
                });

                resolve(data);
            }
        });
    });
}


/**
 * Returns the columns headers from the top of the dataset, excluding specified
 * @param  {[type]} columns [description]
 * @return {[type]}         [description]
 */
export function getSeriesNames(columns) {
    const exclude = ['date', 'annotate'];
    return columns.filter(d => (exclude.indexOf(d) === -1));
}

/**
 * Calculates the extent of multiple columns
 * @param  {[type]} d       [description]
 * @param  {[type]} columns [description]
 * @param  {[type]} yMin    [description]
 * @return {[type]}         [description]
 */
// a function that calculates the cumulative ma min values of the dataset
function getMaxMin(values) {
    let cumulativeMax = d3.sum(values.filter(d => (d > 0)));
    let cumulativeMin = d3.sum(values.filter(d => (d < 0)));
    // console.log(cumulativeMax,cumulativeMin)
   return [cumulativeMin,cumulativeMax]
}

// a function to work out the extent of values in an array accross multiple properties...
export function extentMulti(data, columns) {
    const ext = data.reduce((acc, row) => {
        const values = columns.map(key => +row[key]);
        const maxMin = getMaxMin(values);
        const rowExtent = maxMin;
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
    let values=[]
    d.forEach(function(el,i){
        //console.log(el,i)
        let column=new Object();
        column.name = group
        column.date = el.date
        column.value = +el[group]
        column.highlight = el.highlight
        column.annotate = el.annotate
        if(el[group]) {
            values.push(column)
        }
        if(el[group] == false) {
            values.push(null)
        }

    });
    return values
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