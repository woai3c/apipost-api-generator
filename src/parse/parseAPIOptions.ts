import type { APIRequestBodyRawSchema, APIRequestParameter, APIResponse } from '@/types'
import { addIndent, capitalizeWord, removeJSONComments } from '@/utils'

const dtoTypeMap = {
    number: 'IsNumber',
    string: 'IsString',
    boolean: 'IsBoolean',
    AnyObject: 'IsObject',
    array: 'IsArray',
    File: 'IsObject',
}

export function getDTOType(type: string) {
    return dtoTypeMap[type as keyof typeof dtoTypeMap] || 'IsObject'
}

export function getAPIName(path: string, method: string, noMethod = false) {
    const apiName = path
        .replace(/\.|\d+/g, '') // 清除数字和 .
        .split('/')
        .map((item: string) => {
            if (item.startsWith(':')) {
                item = item.slice(1)
            }

            return item
                .split('-')
                .map((word: any) => capitalizeWord(word))
                .join('')
        })
        .filter(Boolean)
        .join('')
        .replace(/:/g, '') // 清除多余的冒号

    if (noMethod) return apiName
    return `${method.toLowerCase()}${apiName}`
}

export function getBodyPropertyType(type: string, subType = '') {
    if (type === 'array') {
        if (subType) {
            return subType + '[]'
        }

        return 'any[]'
    }

    if (type === 'object') return 'Record<string, any>'

    return type
}

export function getInterfaceOrDTO(generateType: 'api' | 'dto', requestTypeName: string) {
    return `export ${generateType === 'api' ? 'interface' : 'class'} ${requestTypeName} {\n`
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

/**
 * [{ key: 'test' }, { key: 'test.a' }, { key: 'test.b' }] => { test: { a: '', b: '' } }
 */
export function responseRawDataToObject(data: APIRequestParameter[]) {
    let result: AnyObject = {}
    data.forEach((item) => {
        if (item.key) {
            const keys = item.key.split('.')
            if (keys.length === 1) {
                result[item.key] = item.value
                return
            }

            let parent = result
            keys.forEach((key, index) => {
                if (!parent[key]) {
                    parent[key] = {}
                }

                if (index === keys.length - 1) {
                    parent[key] = item.value
                } else {
                    parent = parent[key]
                }
            })
        }
    })

    return result
}

export function parseURL(url: string, requestOptionsType = '', needTransform = false) {
    const result = url.split('?')[0]
    if (!needTransform) return result
    const prefix = requestOptionsType === 'array' || !requestOptionsType ? '' : 'options.'
    // :id => ${options.id}
    return result.replace(/:\w+/g, (match: string) => `\${${prefix}${match.slice(1)}}`)
}

export function parseBodyRawPara(data: APIRequestParameter[]) {
    const result: APIRequestBodyRawSchema = {
        type: 'object',
        description: '',
        properties: {},
        required: [],
    }

    data.forEach((item) => {
        if (item.key) {
            result.properties![item.key] = {
                type: safeTransformType(item.field_type),
                description: item.description,
            }

            result.required!.push(item.key)
        }
    })

    return result
}

export function parseBodyRaw(data: AnyObject) {
    if (Array.isArray(data)) {
        const result: APIRequestBodyRawSchema = {
            type: 'array',
            description: '',
            items: {
                type: getTypeByValue(data[0]),
            },
        }

        return result
    }

    const result: APIRequestBodyRawSchema = {
        type: 'object',
        description: '',
        properties: {},
        required: [],
    }

    Object.keys(data).forEach((key) => {
        result.properties![key] = {
            type: getTypeByValue(data[key]),
        }
    })

    return result
}

export function getResponseTypeCode(responseTypeName: string, response?: APIResponse) {
    if (!response?.success) return ''

    const { raw, parameter, expect } = response.success
    if (!raw && !parameter.length && !expect?.mock && !expect?.schema) return ''

    let code = ''
    if (raw) {
        try {
            const data = JSON.parse(removeJSONComments(raw))
            if (Array.isArray(data)) {
                code += getArrayTypeCode(data[0])
            } else if (typeof data === 'object' && Object.keys(data).length) {
                code += getObjectTypeCode(data)
            } else if (data[0] !== undefined) {
                code += getArrayTypeCode(data[0])
            }
        } catch (error) {}
    } else if (parameter.length) {
        const data = responseRawDataToObject(parameter)
        if (Object.keys(data).length) {
            code += getObjectTypeCode(data)
        }
    } else if (expect.mock) {
        try {
            const data = JSON.parse(removeJSONComments(expect.mock))
            if (Array.isArray(data)) {
                code += getArrayTypeCode(data[0])
            } else if (typeof data === 'object' && Object.keys(data).length) {
                code += getObjectTypeCode(data)
            }
        } catch (error) {}
    } else if (expect.schema) {
        const { type, properties, required } = expect.schema
        if (type === 'array') {
            code += `export type ${responseTypeName} = any[]\n\n`
        } else if (type === 'object') {
            code += `export interface ${responseTypeName} {\n`
            Object.keys(properties).forEach((key) => {
                code += `${addIndent(1)}${key}`
                if (!required.includes(key)) {
                    code += '?'
                }

                code += `: ${getBodyPropertyType(properties[key].type)}\n`
            })

            code += '}\n\n'
        }
    }

    function getArrayTypeCode(value: any) {
        return `export type ${responseTypeName} = ${getTypeByValue(value)}[]\n\n`
    }

    function getObjectTypeCode(data: AnyObject) {
        let result = `export interface ${responseTypeName} {\n`

        Object.keys(data).forEach((key) => {
            result += `${addIndent(1)}${key}: ${getTypeByValue(data[key])}\n`
        })

        result += '}\n\n'
        return result
    }

    return code
}
