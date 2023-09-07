/* eslint-disable camelcase */
import type { API, APIPostConfig, APIRequestParameter } from '@/types'
import { addIndent, removeJSONComments } from '@/utils'
import {
    getAPIName,
    getBodyPropertyType,
    getDTOType,
    getInterfaceOrDTO,
    getResponseTypeCode,
    parseBodyRaw,
    parseBodyRawPara,
    parseURL,
    safeTransformType,
} from './parseAPIOptions'

let importDTOClassSet: Set<string> = new Set()
export default function parseAPI(api: API, config?: APIPostConfig): { code: string; importDTOClassSet: Set<string> } {
    let code = ''
    let requestOptionsType: '' | 'array' | 'params' | 'data' = ''
    let dynamicParameters: string[] = []
    const generateType = config?.type || 'api'
    const { request, response, method = '', name } = api
    const { body, query, resful } = request
    const url = parseURL(request.url)
    const requestTypeName = `${method}${getAPIName(url, method, true)}${generateType === 'api' ? 'Options' : 'DTO'}`

    importDTOClassSet = new Set()

    if (body?.mode === 'form-data' && body.parameter.filter((item) => item.key).length) {
        code += getInterfaceOrDTO(generateType, requestTypeName)
        requestOptionsType = 'data'

        body.parameter.forEach((param: APIRequestParameter, i) => {
            code += getInterfaceOrDTOPropertyCode(generateType, param, i)
        })

        const keys = body.parameter.map((item: APIRequestParameter) => item.key).filter(Boolean)
        const parseResult = parseRestfulParameter(generateType, keys, resful?.parameter)
        code += parseResult.code
        dynamicParameters = parseResult.dynamicParameters

        code += '}\n\n'
    } else if (body?.mode === 'json' && (body.raw_schema?.properties || body.raw || body.raw_para.length)) {
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
            const { properties = {}, required = [], type, items } = body.raw_schema
            if (type === 'array') {
                requestOptionsType = 'array'
                code += `export type ${requestTypeName} = ${items?.type || 'any'}[]\n\n`
            } else {
                requestOptionsType = 'data'
                code += getInterfaceOrDTO(generateType, requestTypeName)

                const keys = Object.keys(properties)
                keys.forEach((key, i) => {
                    const { type, description, oneOf, allOf, anyOf, items } = properties[key]
                    if (generateType === 'dto' && required.includes(key)) {
                        const dtoType = getDTOType(type)
                        importDTOClassSet.add(dtoType)
                        code += `${i ? '\n' : ''}${addIndent(1)}@${dtoType}()\n`
                        code += `${addIndent(1)}@IsNotEmpty()\n`
                    }

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

                const parseResult = parseRestfulParameter(generateType, keys, resful?.parameter)
                code += parseResult.code
                dynamicParameters = parseResult.dynamicParameters

                code += '}\n\n'
            }
        }
    } else if (body?.mode === 'urlencoded' && body.parameter.filter((item) => item.key).length) {
        code += getInterfaceOrDTO(generateType, requestTypeName)
        requestOptionsType = 'data'

        body.parameter.forEach((param: APIRequestParameter, i) => {
            code += getInterfaceOrDTOPropertyCode(generateType, param, i)
        })

        const keys = body.parameter.map((item: APIRequestParameter) => item.key).filter(Boolean)
        const parseResult = parseRestfulParameter(generateType, keys, resful?.parameter)
        code += parseResult.code
        dynamicParameters = parseResult.dynamicParameters

        code += '}\n\n'
    } else if (query?.parameter?.filter((item) => item.key).length) {
        code += getInterfaceOrDTO(generateType, requestTypeName)
        requestOptionsType = 'params'

        const keys = query.parameter.map((item: APIRequestParameter) => item.key).filter(Boolean)
        query.parameter.forEach((param: APIRequestParameter, i) => {
            code += getInterfaceOrDTOPropertyCode(generateType, param, i)
        })

        const parseResult = parseRestfulParameter(generateType, keys, resful?.parameter)
        code += parseResult.code
        dynamicParameters = parseResult.dynamicParameters

        code += '}\n\n'
    }

    if (generateType === 'dto') return { code, importDTOClassSet }

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

    let optionsCode = 'options'
    if (dynamicParameters.length) {
        code += `${addIndent(1)}const { ${dynamicParameters.join(', ')}, ...rest } = options\n`
        optionsCode = 'rest'
    }

    code += `${addIndent(1)}return request({\n`
    code += `${addIndent(2)}url: \`${parseURL(url, true)}\`,\n`
    code += `${addIndent(2)}method: '${method}',\n`

    if (requestOptionsType && body?.mode && method !== 'GET') {
        if (body.mode === 'urlencoded') {
            code += `${addIndent(2)}data: new URLSearchParams(${optionsCode} as unknown as Record<string, string>),\n`
        } else {
            code += `${addIndent(2)}data: ${optionsCode},\n`
        }
    } else if (query?.parameter?.filter((item) => item.key).length && method === 'GET') {
        code += `${addIndent(2)}params: ${optionsCode},\n`
    }

    code += `${addIndent(1)}})\n`
    code += '}\n\n'

    if (typeof config?.apiLoader === 'function') {
        return {
            importDTOClassSet,
            code: config.apiLoader(code),
        }
    }

    return { code, importDTOClassSet }
}

function parseRestfulParameter(generateType: 'api' | 'dto', keys: string[], data?: APIRequestParameter[]) {
    let code = ''
    const dynamicParameters: string[] = []

    if (!data) return { code, dynamicParameters }

    data.forEach((item: APIRequestParameter) => {
        const { description, key, field_type } = item
        // 参数名不存在或参数名重复
        if (!key || keys.includes(key)) return
        dynamicParameters.push(key)

        const finalType = safeTransformType(field_type)
        if (generateType === 'dto') {
            const dtoType = getDTOType(finalType)
            importDTOClassSet.add(dtoType)
            code += `\n${addIndent(1)}@${dtoType}()\n`
            code += `${addIndent(1)}@IsNotEmpty()\n`
        }

        code += `${addIndent(1)}${key}: ${safeTransformType(field_type)}`

        if (description) {
            code += ` // ${description}`
        }

        code += '\n'
    })

    return { code, dynamicParameters }
}

function getInterfaceOrDTOPropertyCode(generateType: 'api' | 'dto', param: APIRequestParameter, i: number) {
    const { field_type, key, type, description, not_null } = param
    if (!key) return ''

    let code = ''
    const finalType = type === 'File' ? type : safeTransformType(field_type)
    if (generateType === 'dto' && not_null !== -1) {
        const dtoType = getDTOType(finalType)
        importDTOClassSet.add(dtoType)
        code += `${i ? '\n' : ''}${addIndent(1)}@${dtoType}()\n`
        code += `${addIndent(1)}@IsNotEmpty()\n`
    }

    code += `${addIndent(1)}${key}`

    // 可选参数
    if (not_null === -1) {
        code += '?'
    }

    code += `: ${finalType}`
    if (description) {
        code += ` // ${description}`
    }

    code += '\n'

    return code
}
