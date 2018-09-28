const {ticks} = require("d3-array")
const {format} = require("d3-format")
const constant = require("../node_modules/d3-scale/src/constant")
const nice = require("../node_modules/d3-scale/src/nice")
const continuous = require("../node_modules/d3-scale/src/continuous").default
const copy = require("../node_modules/d3-scale/src/continuous").copy
const Logicle = require('./logicle-scale.js')

var logicle = new Logicle(262000, 0.4, 4.5, 0.7)

function deinterpolate(a, b) {
  return function (x) { return logicle.scale(x) }
}

function reinterpolate(a, b) {
  return function(x) { return a > b ? logicle.inverse(logicle.scale(262000) - x) : logicle.inverse(x) }
}

function reflect(f) {
  return function(x) {
    return -f(-x)
  }
}

module.exports = function log() {

  var scale = continuous(deinterpolate, reinterpolate).domain([-120, 262000]),
      domain = scale.domain

  scale.domain = function(_) {
    return arguments.length ? domain(_) : domain()
  }

  scale.ticks = function(count) {
    return logicle.axisLabels()
  }

  scale.tickFormat = function(count, specifier) {
    return ".0e"
  }

  scale.nice = function() {
    return domain(nice(domain(), {
      floor: function(x) { return pows(Math.floor(logs(x))) },
      ceil: function(x) { return pows(Math.ceil(logs(x))) }
    }))
  }

  scale.copy = function() {
    return copy(scale, log())
  }

  return scale
}