import parseAPI from '@/parse/parseAPI'
import json from './apipost.json'
import type { API, APIFile } from '@/types'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { getCodeWithDTO } from '@/utils'

test('parse API dto', () => {
    const expectCode = readFileSync(resolve(__dirname, './result.txt'), 'utf-8')
    const { code, importDTOClassSet } = parseAPI(json.apis[0] as unknown as API, { type: 'dto' } as any)
    const apiFile = {
        code,
        importDTOClassSet,
    }

    expect(getCodeWithDTO(apiFile as APIFile, { type: 'dto' } as any)).toBe(expectCode)
})
