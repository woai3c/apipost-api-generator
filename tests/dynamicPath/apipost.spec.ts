import parseAPI from '@/parse/parseAPI'
import json from './apipost.json'
import type { API } from '@/types'
import { readFileSync } from 'fs'
import { resolve } from 'path'

test('parse API dynamicPath', () => {
    const expectCode = readFileSync(resolve(__dirname, './result.txt'), 'utf-8')
    expect(parseAPI(json.apis[0] as unknown as API)).toBe(expectCode)
})
