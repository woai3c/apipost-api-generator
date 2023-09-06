module.exports = {
    // apipost 接口数据文件
    entry: './apipost.json',
    // 文件生成时自动添加头部的代码 default: import request from 'axios'
    fileHeader: "import request from '@/utils/request'\n\n",
    // 文件生成时自动添加底部的代码
    fileFooter: '',
    // 每次生成 api 代码时触发，参数是生成的 api 代码，可以通过 loader 二次处理后将代码返回
    // apiLoader(code) {
    //     return code
    // },
    // 文件名映射，示例：{ '文件上传': 'upload' }，生成的文件名是根据 apipost 中配置的名称生成的
    // 如果这个文件名不是你想要的，可以通过这个配置进行转换
    fileNameMap: {
        插件管理: 'pluginManager',
        新增插件: 'addPlugin',
    },
    // api 文件输出目录 default: api-post-files
    output: '',
    // 输出目录前是否要清空目录 default: false
    clear: false,
}
