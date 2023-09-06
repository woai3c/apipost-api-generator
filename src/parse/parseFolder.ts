import type { API, APIFile, APIPostConfig } from '@/types'
import parseAPI from './parseAPI'

export default function parseFolder(apis: API[], config: APIPostConfig) {
    const result = apis.map((api: API) => {
        const apiFile: APIFile = {
            name: api.name,
            code: '',
            children: [],
            importDTOClassSet: new Set(),
        }

        if (api.target_type === 'folder') {
            apiFile.children = parseFolder(api.children, config)
        } else {
            const { code, importDTOClassSet } = parseAPI(api, config)
            apiFile.code += code
            apiFile.importDTOClassSet = new Set([...apiFile.importDTOClassSet, ...importDTOClassSet])
        }

        return apiFile
    })

    return result
}
