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

export function getCodeWithDTO(file: APIFile, config: APIPostConfig) {
    if (config.type === 'dto') {
        const arr = Array.from(file.importDTOClassSet)
        arr.push('IsNotEmpty')
        if (arr.length) {
            file.code = `import { ${arr.join(', ')} } from 'class-validator'\n\n` + file.code
        }
    }

    return file.code || ''
}

export function writeFileTree(dir: string, file: APIFile, config: APIPostConfig) {
    const fileName = config.fileNameMap[file.name] || file.name

    if (file.children?.length) {
        file.children.forEach((child) => {
            writeFileTree(join(dir, fileName), child, config)
        })
    }

    if (file.code) {
        fs.ensureDirSync(dir)
        let code = getCodeWithDTO(file, config)

        if (config.fileHeader) {
            code = config.fileHeader + code
        }

        if (config.fileFooter) {
            code += config.fileFooter
        }

        /**
         * 如果子文件夹下面还有文件侠，则需要生成一个和当前目录同名的文件
         * 如果子文件夹下面全部都是文件，则将它们全部合并到一个文件中
         * - files
         *   - a
         *   - b
         * 上面的目录结构生成 files.ts
         * ---------------------------
         * - files
         *   - a
         *   - b
         *   - c
         *     - z
         *     - x
         * 上面的目录结构生成
         * - files
         *   - files.ts -> a + b 合成
         *   - c.ts -> z + x 合成
         */
        const suffix = config.type === 'dto' ? '.dto.ts' : '.ts'
        let finalFileName = ''
        if (file.children?.length) {
            finalFileName = join(dir, fileName)
            fs.ensureDirSync(finalFileName)
            finalFileName = join(finalFileName, fileName + suffix)
        } else {
            finalFileName = join(dir, fileName + suffix)
        }

        fs.writeFileSync(finalFileName, code)
    }
}
