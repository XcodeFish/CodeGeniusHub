# AI智能代码生成与协作平台 技术选型与初始化部署方案

## 一、技术选型

### 1. 后端

- **主框架**：NestJS（TypeScript）
- **数据库**：MongoDB
- **实时通信**：Socket.io
- **鉴权**：JWT（jsonwebtoken、passport、passport-jwt）
- **参数校验**：class-validator、class-transformer
- **限流**：@nestjs/throttler
- **AI能力**：OpenAI API（axios）
- **环境变量管理**：dotenv

### 2. 前端

- **主框架**：Next.js（React, TypeScript）
- **UI组件库**：Ant Design（最新版本）
- **代码编辑器**：Monaco Editor（@monaco-editor/react）
- **实时通信**：socket.io-client
- **API请求**：axios

### 3. 其他建议

- **状态管理**：zustand
- **样式**：Antd自带

---

## 二、依赖推荐

### 后端 package.json 主要依赖

```json
"dependencies": {
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "@nestjs/mongoose": "^10.0.0",
  "mongoose": "^7.0.0",
  "@nestjs/jwt": "^10.0.0",
  "passport": "^0.6.0",
  "passport-jwt": "^4.0.1",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1",
  "axios": "^1.6.0",
  "dotenv": "^16.0.0"
},
"devDependencies": {
  "typescript": "^5.0.0",
  "ts-node": "^10.0.0",
  "@types/node": "^20.0.0",
  "@types/express": "^4.17.0",
  "@types/jest": "^29.0.0",
  "jest": "^29.0.0",
  "supertest": "^6.0.0"
}
```

### 前端 package.json 主要依赖

```json
"dependencies": {
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "monaco-editor": "^0.44.0",
  "@monaco-editor/react": "^4.4.6",
  "socket.io-client": "^4.7.0",
  "antd": "^5.15.0",
  "axios": "^1.6.0"
},
"devDependencies": {
  "typescript": "^5.0.0",
  "@types/react": "^18.0.0",
  "@types/node": "^20.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0"
}
```

---

## 三、项目初始化脚本

### 1. 后端（NestJS + MongoDB）

```bash
# 安装Nest CLI
pnpm i -g @nestjs/cli

# 创建项目
nest new backend
cd backend

# 安装依赖
pnpm install @nestjs/websockets @nestjs/platform-socket.io @nestjs/mongoose mongoose @nestjs/jwt passport passport-jwt class-validator class-transformer  axios dotenv
```

### 2. 前端（Next.js + Antd + Monaco Editor）

```bash
# 创建Next.js项目
npx create-next-app@latest frontend --typescript
cd frontend

# 安装依赖
pnpm install monaco-editor @monaco-editor/react socket.io-client antd axios
```

---

## 四、部署建议（适合华为云Flexus小型服务器）

### 1. Node.js环境准备

- 推荐Node.js 18.x或20.x LTS
- 安装pm2（进程管理）：

  ```bash
  pnpm install -g pm2
  ```

### 2. 后端部署

- 构建NestJS项目：

  ```bash
  pnpm run build
  pm2 start dist/main.js --name backend
  # 或直接用 pm2 start pnpm --name backend -- run start:prod
  ```

### 3. 前端部署

- Next.js SSR部署（推荐）：

  ```bash
  pnpm run build
  pm2 start pnpm --name frontend -- run start
  ```

- Next.js静态导出（如纯前端SPA）：

  ```bash
  pnpm run build
  pnpm run export
  # 将 out 目录内容部署到Nginx或静态服务器
  ```

- Nginx反向代理前后端，或直接用端口区分。

### 4. 环境变量管理

- 后端、前端均用`.env`文件管理敏感信息（如数据库、OpenAI Key等），避免写死在代码中。

### 5. 日志与监控

- pm2-logrotate自动切割日志
- 可选接入华为云监控或自建Prometheus+Grafana

---

## 五、性能与体积优化建议

- 前端按需引入Antd组件，开启Tree Shaking
- 后端只引入必要模块，避免大包依赖
- 静态资源CDN加速
- 数据库定期备份，日志定期清理
- 生产环境关闭调试、压缩前端资源

