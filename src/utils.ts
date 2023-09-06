import { capitalize } from 'lodash-es'
import { join } from 'path'
import fs from 'fs-extra'
import type { APIFile, APIPostConfig } from './types'

const capitalConjunction = ['HTTP', 'HTTPS', 'URL', 'API', 'JSON', 'XML', 'HTML', 'CSS', 'IMG']
export function capitalizeWord(word: string) {
    if (capitalConjunction.includes(word.toUpperCase())) return word.toUpperCase()
    return capitalize(word)
}

export function addIndent(level: number, base = 4) {
    return ' '.repeat(base * level)
}

export function removeJSONComments(str: string) {
    if (!str) return str
    // 删除 // 后到行尾的注释
    let result = str.replace(/(?<!https?:)\/\/.*\r?\n?\t?/g, '')
    // 删除 /*...*/ 注释
    result = result.replace(/\/\*[^*]*\*\/(.*\n)*/g, '')
    result = result.replace(/\r?\n?\t?\s/g, '')
    result = result.replace(/，/g, ',')
    return result
}

const dataTypeMap = {
    Integer: 'number',
    RegExp: 'string',
    Date: 'string',
    Float: 'number',
}

export function safeTransformType(type: string) {
    const result = dataTypeMap[type as keyof typeof dataTypeMap]
    if (result) return result
    return type.toLowerCase()
}

export function getTypeByValue(value: any): string {
    if (value === undefined) return 'any'
    if (Array.isArray(value)) return getTypeByValue(value[0]) + '[]'
    if (typeof value === 'object') return 'Record<string, any>'
    return typeof value
}

export function writeFileTree(dir: string, file: APIFile, config: APIPostConfig) {
    const fileName = config.fileNameMap[file.name] || file.name

    if (file.children?.length) {
        file.children.forEach((child) => {
            writeFileTree(join(dir, fileName), child, config)
        })
    } else if (file.code) {
        fs.ensureDirSync(dir)
        let code = file.code
        if (config.fileHeader) {
            code = config.fileHeader + code
        }

        if (config.fileFooter) {
            code += config.fileFooter
        }

        fs.writeFileSync(join(dir, fileName + '.ts'), code)
    }
}
