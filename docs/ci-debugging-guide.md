# 网页构建与测试排查

CI 使用 Node.js 22、pnpm 9.15.9，执行冻结锁文件安装、测试、前端构建以及 Docker Compose 构建和健康检查。

- 锁文件不一致：使用 pnpm 9.15.9 更新锁文件，不删除锁文件规避错误。
- SQLite ABI 不匹配：不要复用 Electron 的 node_modules，重新安装或重建 better-sqlite3。
- 测试连接失败：允许本机回环 HTTP，测试不调用真实外网 AI。
- 页面空白：检查构建输出、/api/health 和浏览器网络，通过 7456 访问，不能双击 HTML。
- Docker 构建失败：检查基础镜像、npm 网络和 SQLite 原生依赖日志。

日志和备份见 [部署教程](web-deployment.md)。
