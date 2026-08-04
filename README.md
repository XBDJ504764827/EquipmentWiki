# EquipmentWiki

设备维修知识库 —— 公开访问的设备资料查询网站。

## 功能

- 查询设备信息
- 查看设备说明书
- 查看设备图片
- 查看维修知识
- 查看常见故障解决方案

公开知识库网站，无用户系统、登录注册、权限管理及后台管理。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui |
| 后端 | Rust · Axum · SQLx |
| 数据库 | PostgreSQL |
| 文件存储 | Cloudflare R2 |

## 项目结构

```
EquipmentWiki/
├── frontend/            # Next.js 前端
├── backend/             # Rust Axum 后端
├── database/
│   └── migrations/      # SQL migration 文件
├── docs/                # 项目文档
├── scripts/             # 辅助脚本
├── .env.example         # 环境变量模板
└── README.md
```

## 快速开始

### 环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

### 启动后端

```bash
cd backend
cargo run
```

服务默认监听 `http://localhost:8080`。

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:3000`。

## 文档

- [前端说明](frontend/README.md)
- [后端说明](backend/README.md)
- [docs/](docs/) —— 架构、API 设计等文档

## License

见 [LICENSE](LICENSE)。
