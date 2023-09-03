'use strict'

const process = require('process')

/**
 * Calculate load time for ESM modules.
 */
async function esmLoader (modulePath) {
    try {
        const start = process.hrtime.bigint()
        await import(modulePath)
        const end = process.hrtime.bigint()
        process.send({ timespan: Number(end - start) })
        process.exit(1)
    } catch (error) {
        process.emit('error', error)
    }
}

/**
 * Listen for module path.
 */
process.on('message', ({ modulePath }) => {
    if (modulePath) esmLoader(modulePath)
})