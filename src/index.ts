/* eslint-disable import/no-dynamic-require */
import type { API, APIPostConfig } from './types'
import parseFolder from './parse/parseFolder'
import { writeFileTree } from './utils'
import minimist from 'minimist'
import { join } from 'path'
import { isString } from 'lodash-es'
import { readFileSync, removeSync } from 'fs-extra'
import mergeAPIFiles from './parse/mergeAPIFiles'

const cwd = process.cwd()
const args = minimist(process.argv.slice(2))
const config: APIPostConfig = require(join(cwd, args.config || 'apipost.config.js' || 'apipost.config.json'))

if (!config?.entry) {
    throw new Error('entry is required')
}

if (!isString(config.entry)) {
    throw new Error('entry must be string')
}

const apiPostStr = readFileSync(join(cwd, config.entry), 'utf-8')
const apiPostJSON = JSON.parse(apiPostStr)

if (!apiPostJSON.apis || !Array.isArray(apiPostJSON.apis)) {
    throw new Error('not a valid apipost json')
}

if (!config.fileHeader) {
    config.fileHeader = "import request from 'axios'\n\n"
}

if (!config.output) {
    config.output = 'api-post-files'
}

if (config.clear) {
    removeSync(config.output)
}

const files = parseFolder(apiPostJSON.apis as API[], config)

mergeAPIFiles(files)

writeFileTree(
    cwd,
    {
        name: config.output,
        children: files,
    },
    config
)
