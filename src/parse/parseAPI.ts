/* eslint-disable camelcase */
import type { API, APIPostConfig, APIRequestBodyRawSchema, APIRequestParameter, APIResponse } from '@/types'
import { addIndent, capitalizeWord, getTypeByValue, removeJSONComments, safeTransformType } from '@/utils'

export default function parseAPI(api: API, config?: APIPostConfig) {
    let code = ''
    let requestTypeName = ''
    let requestOptionsType: '' | 'array' | 'params' | 'data' = ''
    const { request, response, method = '', name } = api
    const { body, query, resful } = request
    const url = parseURL(request.url)

    if (body?.mode === 'form-data' && body.parameter.filter((item) => item.key).length) {
        requestTypeName = `${method}${getAPIName(url, method, true)}Options`
        code += `export interface ${requestTypeName} {\n`
        requestOptionsType = 'data'

        body.parameter.forEach((param: APIRequestParameter) => {
            const { field_type, key, type, description, not_null } = param
            if (key) {
                code += `${addIndent(1)}${key}`

                // 可选参数
                if (not_null === -1) {
                    code += '?'
                }

                code += `: ${type === 'File' ? type : safeTransformType(field_type)}`
                if (description) {
                    code += ` // ${description}`
                }

                code += '\n'
            }
        })

        const keys = body.parameter.map((item: APIRequestParameter) => item.key).filter(Boolean)
        code += parseRestfulParameter(keys, resful?.parameter)
        code += '}\n\n'
    } else if (body?.mode === 'json' && (body.raw_schema || body.raw || body.raw_para.length)) {
        if (!body?.raw_schema?.properties) {
            if (body.raw_para.length) {
                try {
                    body.raw_schema = parseBodyRawPara(body.raw_para)
                } catch (error) {
                    body.raw_schema = {
                        type: 'object',
                        description: '',
                        properties: {},
                        required: [],
                    }
                }
            } else if (body.raw) {
                try {
                    body.raw_schema = parseBodyRaw(JSON.parse(removeJSONComments(body.raw)))
                } catch (error) {
                    body.raw_schema = {
                        type: 'object',
                        description: '',
                        properties: {},
                        required: [],
                    }
                }
            }
        }

        if (body.raw_schema) {
            requestTypeName = `${method}${getAPIName(url, method, true)}Options`
            const { properties = {}, required = [], type, items } = body.raw_schema
            if (type === 'array') {
                requestOptionsType = 'array'
                code += `export type ${requestTypeName} = ${items?.type || 'any'}[]\n\n`
            } else {
                requestOptionsType = 'data'
                code += `export interface ${requestTypeName} {\n`

                const keys = Object.keys(properties)
                keys.forEach((key) => {
                    const { type, description, oneOf, allOf, anyOf, items } = properties[key]
                    code += `${addIndent(1)}${key}`

                    // 可选参数
                    if (!required.includes(key)) {
                        code += '?'
                    }

                    // 多类型，例如 string | number
                    if (oneOf || allOf || anyOf) {
                        const types = [
                            ...new Set(
                                (oneOf || allOf || anyOf)!
                                    .map((item: { type: string }) => getBodyPropertyType(item.type, items?.type))
                                    .filter(Boolean)
                            ),
                        ]
                        code += `: ${types.join(' | ')}`
                    } else {
                        code += `: ${getBodyPropertyType(type, items?.type)}`
                    }

                    if (description) {
                        code += ` // ${description}`
                    }

                    code += '\n'
                })

                code += parseRestfulParameter(keys, resful?.parameter)
                code += '}\n\n'
            }
        }
    } else if (body?.mode === 'urlencoded' && body.parameter.filter((item) => item.key).length) {
        requestTypeName = `${method}${getAPIName(url, method, true)}Options`
        code += `export interface ${requestTypeName} {\n`
        requestOptionsType = 'data'

        body.parameter.forEach((param: APIRequestParameter) => {
            const { field_type, key, type, description, not_null } = param
            if (key) {
                code += `${addIndent(1)}${key}`

                // 可选参数
                if (not_null === -1) {
                    code += '?'
                }

                code += `: ${type === 'File' ? type : safeTransformType(field_type)}`
                if (description) {
                    code += ` // ${description}`
                }

                code += '\n'
            }
        })

        const keys = body.parameter.map((item: APIRequestParameter) => item.key).filter(Boolean)
        code += parseRestfulParameter(keys, resful?.parameter)
        code += '}\n\n'
    } else if (query?.parameter?.filter((item) => item.key).length) {
        requestTypeName = `${method}${getAPIName(url, method, true)}Options`
        code += `export interface ${requestTypeName} {\n`
        requestOptionsType = 'params'

        const keys = query.parameter.map((item: APIRequestParameter) => item.key).filter(Boolean)
        query.parameter.forEach((item: APIRequestParameter) => {
            const { description, key, not_null, field_type } = item
            if (!key) return

            code += `${addIndent(1)}${key}`

            // 可选参数
            if (not_null === -1) {
                code += '?'
            }

            code += `: ${safeTransformType(field_type)}`

            if (description) {
                code += ` // ${description}`
            }

            code += '\n'
        })

        code += parseRestfulParameter(keys, resful?.parameter)
        code += '}\n\n'
    }

    const responseTypeName = `${method}${getAPIName(url, method, true)}Response`
    const responseCode = getResponseTypeCode(responseTypeName, response)

    code += responseCode
    code += '/**\n'
    code += ` * ${name}\n`
    code += ' */\n'
    code += `export function ${getAPIName(url, method)}(`

    if (requestOptionsType) {
        code += `options: ${requestTypeName}`
        if (requestOptionsType === 'array' && resful?.parameter?.length) {
            code += ', '
            const len = resful.parameter.length
            resful.parameter.forEach((item: APIRequestParameter, i) => {
                if (item.key) {
                    code += `${item.key}: ${safeTransformType(item.field_type)}${i === len - 1 ? '' : ', '}`
                }
            })
        }
    } else if (resful?.parameter?.length) {
        const len = resful.parameter.length
        resful.parameter.forEach((item: APIRequestParameter, i) => {
            if (item.key) {
                code += `${item.key}: ${safeTransformType(item.field_type)}${i === len - 1 ? '' : ', '}`
            }
        })
    }

    if (responseCode) {
        code += `): Promise<${responseTypeName}> {\n`
    } else {
        code += ') {\n'
    }

    code += `${addIndent(1)}return request({\n`
    code += `${addIndent(2)}url: \`${parseURL(url, requestOptionsType, true)}\`,\n`
    code += `${addIndent(2)}method: '${method}',\n`

    if (requestOptionsType && body?.mode && method !== 'GET') {
        if (body.mode === 'urlencoded') {
            code += `${addIndent(2)}data: new URLSearchParams(options as unknown as Record<string, string>),\n`
        } else {
            code += `${addIndent(2)}data: options,\n`
        }
    } else if (query?.parameter?.filter((item) => item.key).length && method === 'GET') {
        code += `${addIndent(2)}params: options,\n`
    }

    code += `${addIndent(1)}})\n`
    code += '}\n\n'

    if (typeof config?.apiLoader === 'function') {
        return config.apiLoader(code)
    }

    return code
}

function parseRestfulParameter(keys: string[], data?: APIRequestParameter[]) {
    if (!data) return ''

    let code = ''
    data.forEach((item: APIRequestParameter) => {
        const { description, key, field_type } = item
        // 参数名不存在或参数名重复
        if (!key || keys.includes(key)) return

        code += `${addIndent(1)}${key}: ${safeTransformType(field_type)}`

        if (description) {
            code += ` // ${description}`
        }

        code += '\n'
    })

    return code
}

function parseURL(url: string, requestOptionsType = '', needTransform = false) {
    const result = url.split('?')[0]
    if (!needTransform) return result
    const prefix = requestOptionsType === 'array' || !requestOptionsType ? '' : 'options.'
    // :id => ${options.id}
    return result.replace(/:\w+/g, (match: string) => `\${${prefix}${match.slice(1)}}`)
}

function parseBodyRawPara(data: APIRequestParameter[]) {
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

function getResponseTypeCode(responseTypeName: string, response?: APIResponse) {
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

function getAPIName(path: string, method: string, noMethod = false) {
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

function getBodyPropertyType(type: string, subType = '') {
    if (type === 'array') {
        if (subType) {
            return subType + '[]'
        }

        return 'any[]'
    }

    if (type === 'object') return 'Record<string, any>'

    return type
}

function parseBodyRaw(data: AnyObject) {
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

/**
 * [{ key: 'test' }, { key: 'test.a' }, { key: 'test.b' }] => { test: { a: '', b: '' } }
 */
function responseRawDataToObject(data: APIRequestParameter[]) {
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
