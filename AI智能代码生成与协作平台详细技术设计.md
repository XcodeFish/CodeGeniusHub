# AI智能代码生成与协作平台 详细技术设计

---

## 一、后端技术设计（NestJS + MongoDB）

### 1. 目录结构建议

```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── modules/
│   │   ├── auth/           # 鉴权与用户
│   │   ├── user/           # 用户信息
│   │   ├── project/        # 项目管理
│   │   ├── file/           # 文件与版本
│   │   ├── ai/             # AI能力
│   │   ├── collaboration/  # 协作与Socket
│   │   └── common/         # 公共工具/装饰器
│   ├── config/             # 配置（如env、数据库）
│   └── shared/             # DTO、常量、拦截器等
├── test/
├── .env
└── ...
```

### 2. 模块划分与主要技术点

- **auth**：JWT鉴权、注册登录、权限守卫
- **user**：用户信息，如基本信息、权限分配（admin权限才能）
- **project**：项目增删查改、成员管理
- **file**：文件内容、版本、diff、回滚
- **ai**：OpenAI API集成、代码生成/分析
- **collaboration**：Socket.io实时协作、在线状态、评论
- **common/shared**：DTO、异常过滤、日志、限流

### 3. 接口分层

- Controller（路由）→ Service（业务）→ Model/Repository（数据）
- DTO做参数校验，Service做业务逻辑，Model对接MongoDB

### 4. Socket通信设计

- 每个项目/文件一个房间（room），用户加入/离开时广播状态
- 支持事件：edit、cursor、comment、status
- 权限校验：Socket连接时校验JWT

### 5. 鉴权与限流

- JWT全局守卫，接口和Socket均需token
- @nestjs/throttler做接口限流，AI接口单独限流

### 6. AI能力集成

- 使用axios调用OpenAI API，API Key存.env
- AI请求参数、响应结构统一，错误处理友好

### 7. 关键代码示例

**Socket JWT守卫示例**

```ts
// collaboration.gateway.ts
@UseGuards(WsJwtGuard)
@WebSocketGateway()
export class CollaborationGateway {
  @SubscribeMessage('edit')
  handleEdit(@ConnectedSocket() client, @MessageBody() data) {
    // ...
  }
}
```

**AI模块调用OpenAI**

```ts
@Injectable()
export class AiService {
  async generateCode(prompt: string, language: string) {
    const res = await this.http.post('https://api.openai.com/v1/xxx', { prompt, language }, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_KEY}` }
    });
    return res.data;
  }
}
```

### 登录与认证设计

- **多标识登录**：
  - 支持用户通过**用户名、邮箱或手机号**配合密码进行登录。
  - 后端根据输入的标识符自动判断类型并在相应字段中查询用户。
- **验证码校验**：
  - 登录时需要输入随机验证码进行二次校验，增强安全性。
  - 后端接口获取验证码，并保存在数据库中， 前端展示验证码，登录输入账号、密码以及验证码进行登录。
- **记住我/自动登录**：
  - 登录时如勾选"记住我"，后端在响应中设置`refresh token`到`httpOnly cookie`（不可被JS读取，防XSS）。
  - access token（短期有效）用于API请求，refresh token（长期有效）用于自动续签access token。
  - 前端每次启动检测cookie，若有refresh token则自动请求新access token，实现自动登录。
  - access token失效时，前端自动用refresh token换取新token，无感知续签。
- **安全建议**：refresh token仅存httpOnly cookie，access token可存内存或短期localStorage。验证码应有时效性并一次性使用。

### 忘记密码功能设计（邮箱找回）

- 用户在登录页点击"忘记密码"，输入注册邮箱。
- 后端生成一次性重置token，发送重置链接到用户邮箱（如 <https://yourdomain.com/reset?token=xxx）。>
- 用户点击链接，跳转到前端重置密码页，输入新密码。
- 前端带token和新密码请求后端，后端校验token有效性，重置密码。
- **主要接口**：
  - `POST /api/auth/forgot-password`（发送重置邮件）
  - `POST /api/auth/reset-password`（重置密码）
- **安全建议**：重置token应有时效（如30分钟），用完即失效。
- 邮件服务可用nodemailer+第三方SMTP（如阿里云、SendGrid等）。

### 注册参数设计

- 注册时**邮箱为必填**，用于唯一性校验、找回密码、通知等。
- **用户名可选但建议填写**，需保证唯一性，方便用户登录和标识。
- 手机号可选，后续如需短信通知或短信验证码登录可使用。
- 所有作为登录标识的字段（邮箱、用户名、手机号）均需唯一性校验。

---

## 二、前端技术设计（Next.js + Antd + Monaco + zustand + Sass）

### 1. 目录结构与模块划分

```
frontend/
├── src/
│   ├── pages/                # Next.js页面
│   ├── components/           # 通用组件
│   ├── modules/              # 业务模块（Project、Editor、AI、Docs等）
│   │   ├── Project/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── useProject.ts      # 业务hooks（接口、业务逻辑、store交互）
│   │   ├── Editor/
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── useEditor.ts
│   │   ├── AIHelper/
│   │   │   ├── AIHelperPanel.tsx
│   │   │   ├── useAIHelper.ts
│   │   ├── Docs/
│   │   │   ├── DocsGuide.tsx      # 首次登录引导/帮助
│   │   │   ├── useDocs.ts
│   │   └── ...
│   ├── stores/               # zustand全局状态（仅存状态）
│   │   ├── userStore.ts
│   │   ├── projectStore.ts
│   │   ├── editorStore.ts
│   │   ├── aiStore.ts
│   │   ├── uiStore.ts
│   ├── hooks/                # 通用hooks（如useSocket）
│   ├── utils/                # 工具函数
│   ├── services/             # API请求封装
│   ├── styles/               # 全局/模块样式
│   └── config/               # 配置（如主题、常量）
├── public/
├── .env.local
└── ...
```

### 2. store与hooks分离最佳实践

- store只负责状态（set/get），不做副作用（如API、Socket等）
- 每个业务模块下有自己的useXXX.ts hooks，负责接口请求、Socket事件、业务逻辑，并与store交互
- 组件只调用hooks，hooks内部再调用store

#### store示例

```ts
// stores/projectStore.ts
import { create } from 'zustand';
export const useProjectStore = create(set => ({
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project })
}));
```

#### hooks示例

```ts
// modules/Project/useProject.ts
import { useProjectStore } from '@/stores/projectStore';
import axios from 'axios';
export function useProject() {
  const { projects, setProjects, currentProject, setCurrentProject } = useProjectStore();
  const fetchProjects = async () => {
    const res = await axios.get('/api/project');
    setProjects(res.data.projects);
  };
  const selectProject = (project) => setCurrentProject(project);
  return { projects, currentProject, fetchProjects, selectProject };
}
```

#### 组件示例

```tsx
// modules/Project/ProjectList.tsx
import { useProject } from './useProject';
export default function ProjectList() {
  const { projects, fetchProjects, selectProject } = useProject();
  // ...
}
```

### 3. 团队协作规范建议

- 每个业务模块（如Project、Editor、AIHelper、Docs）自有目录，包含UI组件和业务hooks
- store统一放在stores/，只做状态管理
- hooks统一放在各模块目录下，负责副作用和业务逻辑
- 公共hooks（如useSocket）放在hooks/
- API请求统一封装在services/，便于mock和测试
- 组件只调用hooks，不直接操作store
- 代码风格、命名、注释、分支管理等遵循团队统一规范

### 4. 首次登录引导功能设计

- 新增Docs模块，包含DocsGuide.tsx（引导页/帮助页）、useDocs.ts（如需状态）
- userStore中增加firstLogin字段（可由后端返回或本地判断）
- 用户首次登录时，自动弹出或跳转到DocsGuide页面，展示系统使用说明、常见问题、操作指引等
- 支持用户关闭引导，下次不再显示（可本地存储或后端标记）

#### 关键代码示例

```ts
// stores/userStore.ts
export const useUserStore = create(set => ({
  user: null,
  token: '',
  role: 'viewer',
  firstLogin: true,
  setUser: (user, token, role, firstLogin) => set({ user, token, role, firstLogin }),
  setFirstLogin: (firstLogin) => set({ firstLogin }),
  logout: () => set({ user: null, token: '', role: 'viewer', firstLogin: true })
}));
```

```tsx
// modules/Docs/DocsGuide.tsx
import { useUserStore } from '@/stores/userStore';
export default function DocsGuide() {
  const setFirstLogin = useUserStore(s => s.setFirstLogin);
  return (
    <div>
      <h2>欢迎使用AI智能代码生成与协作平台！</h2>
      <ol>
        <li>创建或加入项目，体验多人协作编辑</li>
        <li>在编辑器侧边栏使用AI助手生成代码</li>
        <li>实时查看协作者、评论、版本管理</li>
        <li>如有疑问请查阅帮助文档或联系客服</li>
      </ol>
      <button onClick={() => setFirstLogin(false)}>我已了解，开始使用</button>
    </div>
  );
}
```

```tsx
// _app.tsx 或主Layout中
import { useUserStore } from '@/stores/userStore';
import DocsGuide from '@/modules/Docs/DocsGuide';
export default function App({ Component, pageProps }) {
  const firstLogin = useUserStore(s => s.firstLogin);
  return (
    <>
      {firstLogin && <DocsGuide />}
      <Component {...pageProps} />
    </>
  );
}
```

### 登录与记住我/自动登录实现

- 登录页支持用户名/邮箱/手机号多种方式登录，只需填写一种标识符。
- 登录时需填写随机验证码，验证通过后才能提交登录表单。
- 登录页提供"记住我"勾选项。
- 登录成功后，access token存内存，refresh token由后端写入httpOnly cookie。
- 前端每次启动时，自动请求`/api/auth/refresh`接口，用refresh token换取新access token，实现自动登录。
- access token失效时自动续签，无需用户手动登录。
- 登出时清除cookie和内存token。

### 忘记密码功能（邮箱找回）

- 登录页提供"忘记密码"入口，用户输入邮箱，前端请求`/api/auth/forgot-password`。
- 用户收到邮件，点击重置链接，跳转到重置密码页，输入新密码，前端请求`/api/auth/reset-password`。
- 成功后提示用户重新登录。

### 注册参数说明

- 注册表单**必须填写邮箱**，用户名**建议填写**，手机号可选。
- 邮箱、用户名和手机号均需进行唯一性校验。
- 用户注册成功后，可使用邮箱、用户名或手机号配合密码登录。

### 样式方案

- 所有自定义样式、全局样式、模块样式均采用Sass（.scss）。
- Antd组件样式无需改动，业务自定义样式全部用Sass，便于团队协作和维护。
