# Frontend

EquipmentWiki 前端，基于 Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui。

## 技术栈

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui（Base UI，风格 base-nova）

## 目录结构

```
frontend/
├── app/              # 页面与路由
├── components/       # 组件（components/ui 为 shadcn 组件）
├── lib/              # 工具函数（lib/utils.ts）
├── public/           # 静态资源
└── package.json
```

## 快速开始

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## 常用命令

```bash
npm run dev     # 开发模式
npm run build   # 生产构建
npm run start   # 生产启动
npm run lint    # ESLint 检查
```

## 添加 shadcn/ui 组件

```bash
npx shadcn@latest add <component-name>
```

## API 地址

开发环境中后端 API 地址通过 `NEXT_PUBLIC_API_URL` 环境变量配置（默认 `http://localhost:8080`），后续接入业务功能时使用。
