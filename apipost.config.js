module.exports = {
    entry: './apipost.json',
    // default: import request from 'axios'
    fileHeader: "import request from '@/utils/request'\n\n",
    fileFooter: '',
    // 每次生成 api 代码时触发，参数是生成的 api 代码，可以通过 loader 二次处理后将代码返回
    apiLoader(code) {
        return code
    },
    // 文件名映射，示例：{ '文件上传': 'upload' }
    fileNameMap: {
        插件管理: 'pluginManager',
        新增插件: 'addPlugin',
    },
    // api 文件输出目录 default: api-post-files
    output: '',
    // 输出目录前是否要清空目录 default: false
    clear: true,
}
