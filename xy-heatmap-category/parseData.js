/**
 * General data munging functionality
 */

import loadData from '@financial-times/load-data';

/**
 * Parses data file and returns structured data
 * @param  {String} url Path to CSV/TSV/JSON file
 * @return {Object}     Object containing series names, value extent and raw data object
 */
export function load(url, options) { // eslint-disable-line
    return loadData(url).then((result) => {
        const data = result.data ? result.data : result;
        const seriesNames = getSeriesNames(data.columns);

        const groupNames = data.map(d => d.name).filter(d => d); // create an array of the group names

        const catNames = getCatNames(data, seriesNames);

        // Buid the dataset for plotting
        const plotData = data.map(d => ({
            name: d.name,
            groups: getGroups(seriesNames, d),
        }));

        return {
            seriesNames,
            plotData,
            data,
            groupNames,
            catNames,
        };
    });
}


// a function that returns the columns headers from the top of the dataset, excluding specified
function getSeriesNames(columns) {
    const exclude = ['name']; // adjust column headings to match your dataset
    return columns.filter(d => (exclude.indexOf(d) === -1));
}

function getGroups(seriesNames, el) {
    return seriesNames.map(name => ({
        name,
        value: el[name],
    }));
}

function getCatNames(data, seriesNames) {
    const allVals = data.reduce((acc, cur) => acc.concat(seriesNames.map(d => cur[d])), []);

    // identify the unique values in the array
    const filterVals = allVals.filter((v, i) => i === allVals.lastIndexOf(v));

    // remove falsy values
    const uniqVals = filterVals.map(d => d).filter(d => d !== '');
    return uniqVals;
}
