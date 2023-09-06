import type { API, APIFile, APIPostConfig } from '@/types'
import parseAPI from './parseAPI'

export default function parseFolder(apis: API[], config: APIPostConfig) {
    const result = apis.map((api: API) => {
        const apiFile: APIFile = {
            name: api.name,
            code: '',
            children: [],
        }

        if (api.target_type === 'folder') {
            apiFile.children = parseFolder(api.children, config)
        } else {
            apiFile.code += parseAPI(api, config)
        }

        return apiFile
    })

    return result
}
