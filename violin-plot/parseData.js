/**
 * General data munging functionality
 */

import * as d3 from "d3";
import loadData from "@financial-times/load-data";
import * as simpleStats from "simple-statistics";

/**
 * Parses data file and returns structured data
 * @param  {String} url Path to CSV/TSV/JSON file
 * @return {Object}     Object containing series names, value extent and raw data object
 */
export function load(url, options) {
    const { yMin, yMax, kernelBandwidth, minProbability } = options;
    // eslint-disable-line
    return loadData(url).then(result => {
        const data = result.data ? result.data : result;
        data.forEach(d => (d.value = Number(d.value)));

        function kernelEpanechnikov(k) {
            return function(v) {
                return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
            };
        }

        // Get group names
        const groupNames = data
            .map(d => d.group)
            .filter(
                (item, pos, groupNames) => groupNames.indexOf(item) === pos
            );

        // Find the min and max values in the data set
        const valueExtent = d3.extent(data, d => d.value);

        const plotData = groupNames.map((d, i) => {
            let groupValues = data.filter(el => {
                return el.group === d;
            });
            let qValues = groupValues.map(d => d.value);
            qValues = qValues.sort((a, b) => a - b);
            const kernelDensityEstimationFunction = simpleStats.kernelDensityEstimation(
                qValues,
                "gaussian",
                kernelBandwidth
            );
            // Take sample points from range
            let samplePoints = d3.range(yMin, yMax + 1, 1);

            let curvePoints = samplePoints.map(d => [
                d,
                kernelDensityEstimationFunction(d)
            ]);

            while (curvePoints[curvePoints.length - 1][1] < minProbability) {
                curvePoints.pop();
            }
            while (curvePoints[0][1] < minProbability) {
                curvePoints.shift();
            }

            return {
                group: d,
                values: qValues,
                q1: d3.quantile(qValues, 0.25),
                q2: d3.quantile(qValues, 0.5),
                q3: d3.quantile(qValues, 0.75),
                violinPlot: curvePoints
            };
        });

        const maxProbability = maxValueAcrossArrays(
            plotData.map(d => d.violinPlot)
        );

        return {
            valueExtent,
            groupNames,
            plotData,
            maxProbability,
            data
        };
    });
}

function maxValueAcrossArrays(arrays) {
    const maxArray = arrays.map(data => d3.max(data, d => d[1]));
    return d3.max(maxArray);
}