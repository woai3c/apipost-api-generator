import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'
import { watch } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import type { ModuleFormat, OutputOptions, RollupWatchOptions } from 'rollup'

const fileName = 'apipost-api-generator'

function getOptions(output: OutputOptions | OutputOptions[]) {
    const config: RollupWatchOptions = {
        input: 'src/index.ts',
        output,
        plugins: [
            resolve(),
            commonjs(),
            typescript(),
            json({
                compact: true,
            }),
        ],
    }

    return config
}

if (process.env.NODE_ENV === 'development') {
    const watcher = watch(getOptions(getOutput('cjs')))
    console.log('rollup is watching for file change...')

    watcher.on('event', (event) => {
        switch (event.code) {
            case 'START':
                console.log('rollup is rebuilding...')
                break
            case 'ERROR':
                console.log('error in rebuilding.')
                break
            case 'END':
                console.log('rebuild done.\n\n')
        }
    })
}

const formats = ['cjs']

function getOutput(format: ModuleFormat) {
    return {
        format,
        file: `dist/${fileName}.js`,
    }
}

export default getOptions(formats.map(getOutput))
