'use strict'

/**
 * Get colors.
 */
const { green, yellow, red } = require('picocolors')

/**
 * Very basic logger.
 */
const logger = module.exports = {}
const levels = {
    INFO: green,
    WARN: yellow,
    ERROR: red
}

const log = function (level, args) {
    level = level.toUpperCase()
    console.log(levels[level](level), args.join(' '))
}

logger.info = (...args) => (log('info', args))
logger.warn = (...args) => (log('warn', args))
logger.error = (...args) => (log('error', args))