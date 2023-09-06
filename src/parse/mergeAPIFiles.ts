import type { APIFile } from '@/types'

/**
 * 将生成的 API 文件进行合并
 * 目前每一个接口都生成一个文件，这样会导致文件过多
 * 所以需要将同一目录下的接口文件进行合并，变成一个文件
 * 如果目录下还有目录，那么继续递归
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
export default function mergeAPIFiles(files: APIFile[]) {
    files.forEach((file) => {
        if (file.children.length) {
            mergeAPIFile(file)
        }
    })

    return files
}

function mergeAPIFile(file: APIFile) {
    const newChildren: APIFile[] = []
    file.children.forEach((child) => {
        if (child.code && !child.children.length) {
            file.code += child.code
        } else if (child.children.length) {
            newChildren.push(mergeAPIFile(child))
        }
    })

    file.children = newChildren

    return file
}
