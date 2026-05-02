# Realtime Sync

基于 WebRTC 的浏览器端实时文本同步与文件传输应用。

## 功能

- **实时文本同步** — 输入文本即时广播至所有在线 peers（150ms 防抖）
- **P2P 文件传输** — 通过 WebRTC DataChannel 在浏览器间直传文件，支持进度追踪、取消、超时自动拒绝
- **连接状态可视化** — Canvas 音频条动画实时反映连接状态
- **暗色模式** — 一键切换亮/暗主题

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript 6 + Vite 8 |
| 样式 | Tailwind CSS 4 + shadcn/ui + Radix UI |
| 信令服务器 | Bun + Hono (WebSocket) |
| P2P 传输 | WebRTC DataChannel (STUN: Google) |
| 编译优化 | React Compiler + Babel plugin |

## 快速开始

```bash
# 安装依赖
bun install

# 启动信令服务器（端口 3002）
bun run serve

# 另开终端，启动前端开发服务器
bun run dev
```

在多个浏览器标签页打开前端页面，即可看到实时同步效果。

## 项目结构

```
├── server/
│   └── index.ts            # Hono WebSocket 信令服务器
├── src/
│   ├── main.tsx             # 入口
│   ├── App.tsx              # 根组件
│   ├── contexts/
│   │   └── sync-context.tsx # 全局状态（信令 + 文本同步 + 文件传输）
│   ├── hooks/
│   │   ├── use-signaling.ts      # WebSocket 信令连接
│   │   ├── use-text-sync.ts      # 文本同步（防抖广播）
│   │   ├── use-file-transfer.ts  # WebRTC 文件传输
│   │   └── use-theme.ts          # 暗色模式
│   ├── components/
│   │   ├── TabsDemo.tsx           # 标签页容器
│   │   ├── TextContent.tsx        # 文本同步面板
│   │   ├── FileContent.tsx        # 文件发送面板
│   │   ├── ConnectionStatus.tsx   # 连接状态动画
│   │   ├── FileNotification.tsx   # 文件接收通知卡片
│   │   ├── FileNotificationContainer.tsx # 通知容器
│   │   ├── FileReceivingProgress.tsx     # 接收进度
│   │   └── ui/                    # shadcn/ui 基础组件
│   └── lib/
│       ├── types.ts          # 类型定义
│       ├── constants.ts      # 常量配置
│       └── utils.ts          # 工具函数
└── components.json           # shadcn/ui 配置
```

## 通信协议

信令服务器通过 WebSocket 转发消息，支持定向发送（`to`）和广播。

| 消息类型 | 方向 | 说明 |
|----------|------|------|
| `peer-id` | 服务端 → 客户端 | 分配 peer ID |
| `peers` | 服务端 → 客户端 | 当前在线 peer 列表 |
| `peer-joined` / `peer-left` | 服务端广播 | peer 上线/离线 |
| `text-update` | peer 广播 | 文本内容同步 |
| `file-offer` | peer 广播 | 发起文件传输邀请 |
| `file-accept` / `file-reject` | peer 定向 | 接受/拒绝文件 |
| `file-cancel` | peer 广播 | 取消传输 |
| `webrtc-signal` | peer 定向 | WebRTC SDP/ICE 交换 |

文件传输流程：发送方广播 `file-offer` → 接收方回复 `file-accept` → 双方通过 `webrtc-signal` 交换 SDP 和 ICE candidate → 建立 WebRTC DataChannel → 分块传输（64KB/块，10MB 背压阈值）。

## 可用脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动 Vite 开发服务器 |
| `bun run serve` | 启动信令服务器（端口 3002） |
| `bun run build` | 构建生产版本 |
| `bun run preview` | 预览构建结果 |
| `bun run lint` | 运行 ESLint |
