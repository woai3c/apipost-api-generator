export interface APIPostOption {
    project: Project
    apis: API[]
    env: ENV[]
    models: AnyObject[]
}

export interface Project {
    name: string
    description: string
    details: ProjectDetail[]
}

export interface ProjectDetail {
    variable: string[]
    servers: ProjectServerDetail[]
    markList: ProjectMarkList[]
    script: AnyObject
    request: AnyObject
}

export interface ProjectServerDetail {
    server_id: string
    name: string
}

export interface ProjectMarkList {
    key: string
    name: string
    color: string
    is_default: boolean
}

export interface API {
    target_type: 'folder' | 'api'
    name: string
    mark: string
    sort: number
    method?: string
    request: APIRequestDetail
    response?: APIResponse
    mock: AnyObject
    mock_url: string
    children: API[]
}

export interface APIResponse {
    success: {
        raw: string
        parameter: APIRequestParameter[]
        expect: {
            mock: string
            schema: {
                type: string
                properties: {
                    [key: string]: {
                        type: string
                    }
                }
                required: string[]
            }
        }
    }
    error: AnyObject
}

export interface APIRequestDetail {
    url: string
    method: string
    description: string
    body: APIRequestBody
    auth: AnyObject
    event: AnyObject
    header: {
        parameter: APIRequestParameter[]
    }
    query: {
        parameter: APIRequestParameter[]
    }
    resful: {
        parameter: APIRequestParameter[]
    }
}

export interface APIRequestBody {
    mode: string
    parameter: APIRequestParameter[]
    raw: string
    raw_para: APIRequestParameter[]
    raw_schema: APIRequestBodyRawSchema
}

export interface APIRequestBodyRawSchema {
    type: string
    description: string
    properties?: {
        [key: string]: {
            type: string
            description?: string
            items?: AnyObject
            oneOf?: AnyObject[]
            anyOf?: AnyObject[]
            allOf?: AnyObject[]
        }
    }
    items?: AnyObject
    required?: string[]
}

export interface APIRequestParameter {
    description: string
    is_checked: number
    key: string
    type: string
    not_null: 1 | -1
    field_type: string
    value: any
}

export interface APIRequestResult {
    raw: string
    parameter: AnyObject[]
    expect: {
        name: string
        isDefault: number
        code: number
        contentType: string
        verifyType: string
        mock: string
        schema: AnyObject[]
    }
}

export interface ENV {
    env_id: string
    list: AnyObject
    name: string
    pre_url: string
    pre_urls: Record<string, string>
}

export interface APIFile {
    name: string
    code?: string
    children: APIFile[]
}

export interface APIPostConfig {
    entry: string
    fileHeader: string
    fileFooter: string
    apiLoader: (code: string) => string
    fileNameMap: Record<string, string>
    output: string
    clear: boolean
}
