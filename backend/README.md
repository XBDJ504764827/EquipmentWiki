# Backend

EquipmentWiki 后端 API，基于 Rust + Axum + SQLx。

## 技术栈

- Rust (edition 2024)
- Axum 0.8
- Tokio
- Serde / Serde JSON
- SQLx (PostgreSQL, runtime-tokio, rustls)
- dotenvy（读取 `.env`）

## 目录结构

```
backend/
├── src/
│   ├── main.rs        # 入口，加载配置并启动服务
│   ├── routes/        # HTTP 路由与处理器
│   ├── models/        # 数据模型
│   ├── services/      # 业务逻辑
│   ├── database/      # 数据库连接池
│   └── config/        # 环境变量配置读取
├── Cargo.toml
└── README.md
```

## 快速开始

1. 在项目根目录创建 `.env`（参考 `.env.example`）：

   ```bash
   cp .env.example .env
   ```

2. 启动服务：

   ```bash
   cargo run
   ```

3. 验证：

   ```bash
   curl http://localhost:8080/
   # {"name":"EquipmentWiki API","status":"running"}
   ```

## 配置项

| 变量 | 说明 |
| --- | --- |
| `SERVER_ADDR` | 服务监听地址，默认 `0.0.0.0:8080` |
| `DATABASE_URL` | PostgreSQL 连接串（SQLx 格式） |
| `R2_ENDPOINT` | Cloudflare R2 S3 兼容端点 |
| `R2_ACCESS_KEY` / `R2_SECRET_KEY` | R2 API 凭证 |
| `R2_BUCKET` | R2 存储桶名称 |

## 数据库迁移

migration SQL 文件位于根目录 `database/migrations/`，后续阶段结合 SQLx CLI 执行。

## 常用命令

```bash
cargo run          # 开发运行
cargo build        # 编译
cargo build --release  # 生产编译
cargo fmt          # 格式化
cargo clippy       # Lint 检查
```
