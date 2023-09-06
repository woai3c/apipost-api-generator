import { getTypeByValue } from '@/parse/parseAPIOptions'
import { removeJSONComments } from '@/utils'

describe('apipost test', () => {
    test('utils getTypeByValue', () => {
        expect(getTypeByValue(1)).toBe('number')
        expect(getTypeByValue('1')).toBe('string')
        expect(getTypeByValue({})).toBe('Record<string, any>')
        expect(getTypeByValue([1])).toBe('number[]')
        expect(getTypeByValue([{}])).toBe('Record<string, any>[]')
    })

    test('utils removeJSONComments', () => {
        expect(removeJSONComments('abc // 123')).toBe('abc')
        expect(removeJSONComments('abc， // 123')).toBe('abc,')
        expect(removeJSONComments('{"abcd": "122"}//测试 123')).toBe('{"abcd":"122"}')
    })
})
