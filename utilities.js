// -------------------------------------------------------------
// Javascript utility functions
// -------------------------------------------------------------

const hslToRGB = require('hsl-to-rgb-for-reals')
const { scaleLog, scaleLinear } = require("d3-scale")
const logicleScale = require('./scales/logicle.js')
const arcsinScale = require('./scales/arcsinh-scale')
const constants = require('../gatekeeper-utilities/constants')

const heatMapHSLStringForValue = function (value) {
    var h = (1.0 - value) * 240
    return "hsl(" + h + ", 100%, 50%)";
}

const getPolygonCenter = function(polygon) {
    var x = polygon.map(function(a){ return a[0] });
    var y = polygon.map(function(a){ return a[1] });
    var minX = Math.min.apply(null, x);
    var maxX = Math.max.apply(null, x);
    var minY = Math.min.apply(null, y);
    var maxY = Math.max.apply(null, y);
    return [(minX + maxX)/2, (minY + maxY)/2];
}

const heatMapRGBForValue = function (value) {
    const h = (1.0 - value) * 240
    const s = 1
    const l = 0.5
    let r, g, b;

    if (s == 0){
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return hslToRGB(h, s, l)
}

const getPlotImageKey = function (options) {
    return `${options.machineType}_${options.selectedXParameterIndex}_${options.selectedXScale}-${options.selectedYParameterIndex}_${options.selectedYScale}`
}


// options shape:
// {
//     selectedXScale,
//     selectedYScale,
//     xRange,
//     yRange,
//     width,
//     height
// }
const getScales = (options) => {
    const scales = {}
    // console.log(options)
    if (options.selectedXScale === constants.SCALE_LINEAR) {
        scales.xScale = scaleLinear().range([0, options.width]) // value -> display
        // don't want dots overlapping axis, so add in buffer to data domain
        scales.xScale.domain([options.xRange[0], options.xRange[1]]);
    // Log Scale
    } else if (options.selectedXScale === constants.SCALE_LOG) {
        // Log scale will break for values <= 0
        scales.xScale = scaleLog()
            .range([0, options.width])
            .base(Math.E)
            .domain([options.xRange[0], options.xRange[1]])
    // Biexponential Scale
    } else if (options.selectedXScale === constants.SCALE_BIEXP) {
        scales.xScale = logicleScale().range([0, options.width])
    // Arcsin scale
    } else if (options.selectedXScale === constants.SCALE_ARCSIN) {
        scales.xScale = arcsinScale().range([0, options.width])
    }

    // setup y
    if (options.selectedYScale === constants.SCALE_LINEAR) {
        scales.yScale = scaleLinear().range([options.height, 0]) // value -> display
        scales.yScale.domain([options.yRange[0], options.yRange[1]]);
    // Log Scale
    } else if (options.selectedYScale === constants.SCALE_LOG) {
        scales.yScale = scaleLog()
            .range([options.height, 0])
            .base(Math.E)
            .domain([options.yRange[0], options.yRange[1]])
    // Biexponential Scale
    } else if (options.selectedYScale === constants.SCALE_BIEXP) {
        scales.yScale = logicleScale().range([options.height, 0])
    // Arcsin scale
    } else if (options.selectedYScale === constants.SCALE_ARCSIN) {
        scales.yScale = arcsinScale().range([options.height, 0])
    }

    // window.scales = scales

    return scales
}

// Get the min and max points of a polygon. See return value.
function getPolygonBoundaries (points) {
    let minX = [Infinity, 0]
    let maxX = [-Infinity, 0]

    let minY = [0, Infinity]
    let maxY = [0, -Infinity]

    for (let point of points) {
        if (point[0] < minX[0]) {
            minX = point
        }

        if (point[0] > maxX[0]) {
            maxX = point
        }

        if (point[1] < minY[1]) {
            minY = point
        }

        if (point[1] > maxY[1]) {
            maxY = point
        }
    }

    return [ [ minX, maxX ], [ minY, maxY ] ]
}

// Returns peaks arranged into groups along the x and y axis
const getAxisGroups = (peaks) => {
    // Percentage of maximum distance between furthest peak to group together
    const maxGroupDistance = 0.3
    // Divide peaks into groups along the x and y axis
    // Get [minX, maxX] range of peaks along x axis
    let xRange = peaks.reduce((acc, curr) => { return [ Math.min(acc[0], curr.nucleus[0]), Math.max(acc[1], curr.nucleus[0]) ] }, [Infinity, -Infinity])
    // Get [minY, maxY] range of peaks along y axis
    let yRange = peaks.reduce((acc, curr) => { return [ Math.min(acc[0], curr.nucleus[1]), Math.max(acc[1], curr.nucleus[1]) ] }, [Infinity, -Infinity])
    // Create buckets and place peaks into groups along each axis
    let xGroups = []
    let yGroups = []
    for (let peak of peaks) {
    
        const newXGroup = () => {
            xGroups.push({
                position: peak.nucleus[0],
                peaks: [ peak.id ]
            })
        }

        // Create a group from the first peak
        if (xGroups.length === 0) {
            newXGroup()
        } else {
            let found = false
        
            for (let group of xGroups) {
                const distance = Math.abs(group.position - peak.nucleus[0])
                // If the peak is within 10% of an existing group, add it to that group
                if (distance < (xRange[1] - xRange[0]) * maxGroupDistance || distance < 20) {
                    group.peaks.push(peak.id)
                    found = true
                }
            }
        
            // Otherwise create a new group
            if (!found) {
                newXGroup()
            }
        }

        const newYGroup = () => {
            yGroups.push({
                position: peak.nucleus[1],
                peaks: [ peak.id ]
            })
        }

        // Create a group from the first peak
        if (yGroups.length === 0) {
            newYGroup()
        } else {
            let found = false
        
            for (let group of yGroups) {
                const distance = Math.abs(group.position - peak.nucleus[1])
                // If the peak is within 10% of an existing group, add it to that group
                if (distance < (yRange[1] - yRange[0]) * maxGroupDistance || distance < 20) {
                    group.peaks.push(peak.id)
                    found = true
                }
            }
        
            // Otherwise create a new group
            if (!found) {
                newYGroup()
            }
        }
    }
    xGroups.sort((a, b) => { return a.position - b.position })
    yGroups.sort((a, b) => { return a.position - b.position })
    return { xGroups, yGroups } 
}

module.exports = { heatMapHSLStringForValue, heatMapRGBForValue, getPlotImageKey, getScales, getPolygonCenter, getPolygonBoundaries, getAxisGroups }
