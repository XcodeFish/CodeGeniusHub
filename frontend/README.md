# AI智能代码生成与协作平台 - 前端

## 技术栈

- Next.js
- TypeScript
- Ant Design
- Monaco Editor
- zustand
- Sass
- Socket.io-client
- Axios

## 目录结构

```
frontend/
├── src/
│   ├── pages/                # Next.js页面
│   ├── components/           # 通用组件
│   ├── modules/              # 业务模块
│   │   ├── Project/          # 项目管理模块
│   │   ├── Editor/           # 编辑器模块
│   │   ├── AIHelper/         # AI助手模块
│   │   ├── Docs/             # 文档/引导模块
│   │   └── ...             # 其他模块
│   ├── stores/               # zustand状态管理
│   ├── hooks/                # 通用hooks
│   ├── utils/                # 工具函数
│   ├── services/             # API请求封装
│   ├── styles/               # 全局/模块样式
│   └── config/               # 配置（如主题、常量）
```

## 开发指南

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 启动生产版本

```bash
pnpm start
```

## 开发规范

1. 使用TypeScript进行开发，保持类型完整
2. 业务模块拆分到modules目录下
3. 全局状态放在stores中，只做状态管理
4. 业务逻辑、副作用放在各模块的hooks中
5. 样式使用Sass，按模块组织
