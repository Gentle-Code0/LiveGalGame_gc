# LiveGalGame Web

本分支提供局域网网页上的对话辅助与复盘工具，保留角色管理、对话历史、AI 回复建议、建议选择、画像和剧情复盘。

已删除语音识别、音频采集、录音回放、桌面悬浮窗和 Android 应用。没有新增手动消息输入，尚未接入 QQ/微信；可使用原有记录和初始示例数据。

## 部署

安装并启动支持 Linux 容器的 Docker，在仓库根目录执行：

```sh
docker compose up -d --build
```

访问 http://localhost:7456 或 `http://部署机器局域网IP:7456`。数据通过命名卷持久化；最终运行环境不需要 Python、Electron 或安装程序。

完整的配置、使用、备份、旧数据库迁移和故障处理见 [部署与使用教程](docs/web-deployment.md)。开发说明见 [desktop/README.md](desktop/README.md)。
