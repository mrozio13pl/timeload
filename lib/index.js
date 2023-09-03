'use strict'

/**
 * Expose `timeload()`.
 */
module.exports = timeload

/**
 * Dependencies.
 */
const process = require('process')
const path = require('path')
const fs = require('fs')
const logger = require('./utils/logger')
const clearModule = require('clear-module')
const unwin = require('unwin')
const hasFlag = require('has-flag')
const niceTry = require('nice-try')
const ms = require('pretty-ms')
const table = require('text-table')
const { cyan, yellow, green, gray } = require('picocolors')
const { fork } = require('child_process')

/**
 * Map for storing modules.
 */
const timespans = new Map()
const packages = new Set()

/**
 * Variables.
 */
const write = process.stdout.write.bind(process.stdout)
const argv = process.argv
const numRunsIndex = argv.indexOf('--runs')

/**
 * Options.
 */
const useDevDependencies = hasFlag('dev')
const useESM = hasFlag('esm')
const numRuns = numRunsIndex !== -1 && argv[numRunsIndex + 1] ? Math.max(1, parseInt(argv[numRunsIndex + 1], 10)) : 5

// hide cursor in terminal
write('\u001B[?25l')

/**
 * Get modules from `package.json` and load them.
 */
async function timeload() {
    const pkg = niceTry(() => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')))

    if (!pkg) return logger.error('Couldn\'t read `package.json`')

    Array.from([...Object.keys(pkg.dependencies || {}), ...Object.keys((useDevDependencies && pkg.devDependencies) || {})])
        .filter(module => !module.startsWith('@types/')) // exclude @types
        .forEach(packages.add, packages)

    if (!packages.size) return logger.info('No dependencies found.')

    for (let i = 0; i < numRuns; i++) {
        for await (const module of packages) {
            const timespan = await requireTime(module)
            write(`\x1b[K${cyan('+')} Run ${i}/${numRuns} - Loading: ${yellow(module)} ${ms(timespan / 1e6, { formatSubMilliseconds: true })}\r`)

            if (!timespans.has(module)) timespans.set(module, [])
            timespans.get(module).push(timespan)
        }
    }

    summary()

    // restore the cursor
    write('\u001B[?25h')
}

/**
 * Generate a table with results.
 */
function summary() {
    let totalLoadTime = 0
    const averages = new Map()

    // get avg.
    timespans.forEach((loadTimes, moduleName) => {
        const loadTime = loadTimes.reduce((sum, time) => sum + time, 0)
        const averageLoadTime = loadTime / loadTimes.length

        totalLoadTime += loadTime
        averages.set(moduleName, averageLoadTime)
    })

    const sorted = [...averages.entries()].sort((a, b) => a[1] - b[1])
    const averageLoadTime = sorted.reduce((sum, [, value]) => sum + value, 0)

    // create a table
    const res = sorted.map(([name, val]) => {
        return [
            name,
            ms(val / 1e6, { formatSubMilliseconds: true, compact: true }),
            `${((val / averageLoadTime) * 100).toFixed(2)}%`
        ]
    })

    // reveal results
    console.log('\x1b[K' + table(res, { align: ['l', 'l', 'r'], hsep: cyan(' | ') }))
    console.log(gray(`Performed ${numRuns} run${numRuns > 1 ? 's' : ''}.`) + '\n')
    if (numRuns > 1) console.log('Average load time: %s', green(ms(averageLoadTime / 1e6, { formatSubMilliseconds: averageLoadTime < 1e8 })))
    console.log('Total load time: %s', green(ms(totalLoadTime / 1e6, { formatSubMilliseconds: totalLoadTime < 1e8 })))
}

/**
 * Get time it takes to load a given module.
 */
async function requireTime(module) {
    const modulePath = niceTry(() => unwin(require.resolve(module, { paths: [process.cwd()] }))) || module
    try {
        if (useESM || isESM(modulePath)) {
            // nodejs/node#49442
            const child = fork(path.join(__dirname, 'loader.js'))
            return new Promise((resolve, reject) => {
                child.send({ modulePath })
                child.on('message', ({ timespan }) => resolve(timespan))
                child.on('error', reject)
                child.on('close', () => reject(new Error('Closed before getting the results.')))
            })
        } else {
            const start = process.hrtime.bigint()
            require(modulePath)
            const end = process.hrtime.bigint()
            clearModule(modulePath)
            return Number(end - start)
        }
    } catch (error) {
        // delete it so in the next run it doesn't execute again
        timespans.delete(module)
        packages.delete(module)
        logger.error(module + ':', error)
        return false
    }
}

/**
 * Determine whether to load a module using dynamic `import` or `require`.
 */
function isESM(moduleName) {
    try {
        const module = require(moduleName)
        clearModule(moduleName)

        return module && module.type === 'module'
    } catch {
        return true
    }
}