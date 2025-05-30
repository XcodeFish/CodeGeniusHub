# AI智能代码生成与协作平台 产品需求文档（最终版）

## 一、产品背景

随着AI技术的发展，智能代码生成和多人协作编程成为提升开发效率的重要手段。当前市场缺乏一款集成AI代码生成、实时协作、代码智能分析与质量评估于一体的开发平台。本产品旨在为开发者提供高效、智能、协作的编程体验。

---

## 二、产品目标

- 提升开发效率，降低开发门槛
- 支持多人实时协作编程
- 提供智能代码生成与质量评估
- 实现代码版本管理与变更追踪

---

## 三、用户需求

1. **高效开发**：用户希望通过AI辅助快速生成高质量代码片段，减少重复性劳动。
2. **实时协作**：团队成员可同时在线编辑同一份代码，实时同步变更，提升协作效率。
3. **代码质量保障**：希望平台能自动分析和评估代码质量，给出优化建议。
4. **版本管理**：需要对代码的历史版本进行管理，支持diff对比和回滚。
5. **易用性**：界面友好，操作简单，降低学习成本。

---

## 四、业务需求

1. 支持AI根据注释/需求生成代码片段
2. 支持多人实时协作编辑同一代码文件
3. 支持代码智能分析与质量评分
4. 支持代码版本管理与diff对比
5. 支持主流编程语言（如JavaScript、Python等）
6. 支持用户权限管理（如只读、可编辑等）

---

## 五、功能描述

### 1. AI代码生成

- 用户输入注释或需求描述，AI自动生成对应代码片段
- 支持多种主流编程语言
- 支持对生成代码的进一步编辑和优化建议

### 2. 实时协作编辑器

- 多人可同时编辑同一代码文件，实时同步内容
- 支持光标位置、选区、编辑历史的实时同步
- 支持代码高亮、自动补全、语法检查

### 3. 代码智能分析

- 自动分析代码质量，给出评分和优化建议
- 检查常见代码问题（如语法错误、潜在bug等）

### 4. 版本管理与diff

- 自动保存代码历史版本
- 支持版本对比（diff）、回滚
- 支持版本标签与备注

### 5. 用户与权限管理

- 支持用户注册、登录
- 支持项目成员管理与权限分配（如只读、可编辑、管理员）

---

## 六、交互设计

### 1. 主要界面结构

- **首页**：项目列表、创建新项目入口
- **项目详情页**：文件列表、协作编辑器、AI生成入口、版本管理面板
- **协作编辑器**：代码区、AI助手侧边栏、协作者列表、聊天/评论区
- **版本管理页**：历史版本列表、diff对比、回滚按钮

### 2. 详细交互原型

#### （1）首页

<p align="center">
  <img src="images/homePage.svg" alt="首页原型" width="600" />
</p>

#### （2）项目详情页

<p align="center">
  <img src="images/projectDetails.svg" alt="项目详情页原型" width="600" />
</p>

#### （3）AI助手侧边栏

<p align="center">
  <img src="images/aiAssistantSidebar.svg" alt="AI助手侧边栏原型" width="350" />
</p>

#### （4）版本管理面板

<p align="center">
  <img src="images/version.svg" alt="版本管理面板原型" width="350" />
</p>

#### （5）协作编辑器实时交互

- 多人同时编辑时，显示不同颜色的光标和选区
- 编辑区右上角显示当前在线协作者头像
- 支持实时评论，评论内容与代码行关联
- 编辑操作自动同步，无需手动保存

#### （6）AI代码生成流程

1. 用户在AI助手侧边栏输入需求/注释
2. 点击"生成代码"按钮
3. AI返回代码片段，用户可选择"插入编辑区"或"继续优化"
4. 生成代码自动高亮显示，支持一键插入

#### （7）版本管理与diff

1. 每次保存自动生成新版本
2. 用户可在版本管理面板选择任意两个版本进行diff对比
3. 支持一键回滚到任意历史版本

#### （8）权限与成员管理

- 项目拥有者可邀请成员，分配权限（只读/可编辑/管理员）
- 成员列表支持移除、权限变更

<p align="center">
  <img src="images/permission.svg" alt="权限与成员管理原型" width="600" />
</p>

#### （登录界面）

<p align="center">
  <img src="images/login.svg" alt="登录界面原型" width="350" />
</p>

---

## 七、技术架构

- 前端：Next.js + Monaco Editor
- AI集成：OpenAI API
- 后端：NestJS
- 实时通信：Socket.io
- 数据库：MongoDB / PostgreSQL（可选）

---

## 八、API接口设计（含详细参数、字段类型、校验规则、错误码）

### 错误码通用说明

| 错误码 | 含义                 |
|--------|----------------------|
| 0      | 成功                 |
| 1001   | 参数缺失/格式错误     |
| 1002   | 未授权/Token无效      |
| 1003   | 权限不足             |
| 1004   | 资源不存在/账号不存在 |
| 1005   | 操作冲突/状态异常     |
| 1006   | 服务器内部错误        |

所有接口响应均包含：

- `code` (number)：错误码，0为成功，非0为失败
- `message` (string)：错误或成功提示

---

### 0. 认证相关接口

#### 1.1 获取图形验证码

`GET /api/auth/captcha`

- **请求参数**：无

- **响应参数**

  | 字段       | 类型    | 说明     |
  |------------|---------|----------|
  | code       | number  | 错误码   |
  | message    | string  | 提示信息 |
  | captchaId  | string  | 验证码唯一标识 |
  | captchaImg | string  | 验证码图片（Base64格式， 六位，大小写字母数字混合） |

*说明：前端通过此接口获取图形验证码图片，并在后续登录请求中携带captchaId和用户输入的验证码进行校验。*

#### 2. 注册

`POST /api/auth/register`

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | email     | string  | 是   | 邮箱格式，唯一      |
  | password  | string  | 是   | 6-32字符           |
  | username  | string  | 是   | 3-20字符，字母数字  |
  | phone     | string  | 否   | 手机号格式         |

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | userId    | uuid    | 用户ID   |
  | token     | string  | access token |

- **错误响应示例**

```json
{ "code": 1001, "message": "邮箱已被注册" }
```

#### 2. 登录

`POST /api/auth/login`

- **请求参数**

  | 字段        | 类型    | 必填 | 校验规则           |
  |-------------|---------|------|--------------------|
  | email       | string  | 是   | 邮箱格式           |
  | password    | string  | 是   | 6-32字符           |
  | remember    | boolean | 否   | 记住我（默认false）|
  | captchaId   | string  | 是   | 图形验证码唯一标识 |
  | captchaCode | string  | 是   | 用户输入的图形验证码 |

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | token     | string  | access token |
  | userId    | uuid    | 用户ID   |
  | permission | string  | 用户权限 |

- **安全说明**：如remember为true，refresh token写入httpOnly cookie。

- **错误响应示例**

```json
{ "code": 1004, "message": "邮箱或密码错误" }
```

```json
{ "code": 1001, "message": "图形验证码错误或已失效" }
```

#### 3. 忘记密码（邮箱找回）

##### 3.1 请求发送验证码

`POST /api/auth/forgot-password`

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | email     | string  | 是   | 邮箱格式           |

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |

- **错误响应示例**

```json
{ "code": 1004, "message": "邮箱未注册" }
```

*说明：后端接收到请求后，会生成一个6位随机大小写字母数字混合的验证码，与该邮箱绑定并设置有效期（例如3分钟），然后通过邮件发送给用户。*

##### 3.2 校验验证码并重置密码

`POST /api/auth/reset-password`

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | email     | string  | 是   | 邮箱格式，用于查找对应的验证码 |
  | verifyCode| string  | 是   | 用户收到的6位验证码 |
  | password  | string  | 是   | 6-32字符           |

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |

- **错误响应示例**

```json
{ "code": 1001, "message": "验证码错误或已失效" }
```

*说明：后端接收到请求后，会根据邮箱查找存储的验证码，校验验证码是否匹配且未过期。校验成功后允许用户重置密码，并使该验证码失效。*

#### 4. 自动登录/刷新token

`POST /api/auth/refresh`

- **请求参数**：无（refresh token在httpOnly cookie中）
- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | token     | string  | 新的access token |

- **错误响应示例**

```json
{ "code": 1002, "message": "登录已过期，请重新登录" }
```

---

### 1. 用户与权限相关

#### `GET /api/user/profile` 获取用户信息

- **请求参数**
  - Header: `Authorization: Bearer <token>`
- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | userId    | uuid    | 用户ID   |
  | username  | string  | 用户名   |
  | email     | string  | 邮箱     |
  | permission | string | 用户权限 |

- **错误响应示例**

```json
{
  "code": 1002,
  "message": "未授权或Token无效"
}
```

#### `POST /api/project/:id/invite` 邀请成员

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | email     | string  | 是   | 邮箱格式           |
  | permission | string  | 是   | viewer/editor/admin|

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | success   | boolean | 是否成功 |

- **错误响应示例**

```json
{
  "code": 1003,
  "message": "权限不足"
}
```

#### `POST /api/project/:id/permission` 变更成员权限

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | userId    | uuid    | 是   |                    |
  | permission | string  | 是   | viewer/editor/admin|

- **响应参数** 同上

---

### 2. 项目与文件管理

#### `POST /api/project` 创建项目

- **请求参数**

  | 字段        | 类型    | 必填 | 校验规则           |
  |-------------|---------|------|--------------------|
  | name        | string  | 是   | 3-30字符           |
  | description | string  | 否   | 最多200字符        |

- **响应参数**

  | 字段        | 类型    | 说明     |
  |-------------|---------|----------|
  | code        | number  | 错误码   |
  | message     | string  | 提示信息 |
  | projectId   | uuid    | 项目ID   |
  | name        | string  | 项目名   |
  | description | string  | 描述     |

- **错误响应示例**

```json
{
  "code": 1001,
  "message": "项目名称不能为空"
}
```

#### `GET /api/project` 获取项目列表

- **请求参数**
  - Header: `Authorization: Bearer <token>`
- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | projects  | array   | 项目列表 |

  - projectId (uuid)
  - name (string)
  - lastUpdated (string)
  - members (array)
- **错误响应示例**

```json
{
  "code": 1002,
  "message": "未授权"
}
```

#### `GET /api/project/:id` 获取项目详情

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | projectId | uuid    | 项目ID   |
  | name      | string  | 项目名   |
  | description | string| 描述     |
  | files     | array   | 文件列表 |

- **错误响应示例**

```json
{
  "code": 1004,
  "message": "项目不存在"
}
```

#### `DELETE /api/project/:id` 删除项目

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | success   | boolean | 是否成功 |

- **错误响应示例**

```json
{
  "code": 1003,
  "message": "权限不足"
}
```

#### `POST /api/project/:id/file` 新建文件

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | filename  | string  | 是   | 1-50字符           |
  | content   | string  | 否   |                    |

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | fileId    | uuid    | 文件ID   |
  | filename  | string  | 文件名   |

- **错误响应示例**

```json
{
  "code": 1005,
  "message": "文件已存在"
}
```

#### `GET /api/project/:id/file/:fileId` 获取文件内容

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | fileId    | uuid    | 文件ID   |
  | filename  | string  | 文件名   |
  | content   | string  | 文件内容 |
  | versions  | array   | 版本列表 |

- **错误响应示例**

```json
{
  "code": 1004,
  "message": "文件不存在"
}
```

#### `PUT /api/project/:id/file/:fileId` 更新文件内容

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | content   | string  | 是   |                    |

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | success   | boolean | 是否成功 |
  | versionId | uuid    | 版本ID   |

- **错误响应示例**

```json
{
  "code": 1006,
  "message": "服务器内部错误"
}
```

#### `DELETE /api/project/:id/file/:fileId` 删除文件

- **响应参数** 同上

---

### 3. AI代码生成与分析

#### `POST /api/ai/generate` 代码生成

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | prompt    | string  | 是   | 1-200字符          |
  | language  | string  | 是   | 支持的语言列表     |
  | context   | string  | 否   |                    |

- **响应参数**

  | 字段        | 类型    | 说明     |
  |-------------|---------|----------|
  | code        | number  | 错误码   |
  | message     | string  | 提示信息 |
  | code        | string  | 代码片段 |
  | explanation | string  | 代码解释 |

- **错误响应示例**

```json
{
  "code": 1001,
  "message": "缺少必要参数"
}
```

#### `POST /api/ai/optimize` 代码优化建议

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | code      | string  | 是   |                    |
  | language  | string  | 是   | 支持的语言列表     |

- **响应参数**

  | 字段        | 类型    | 说明     |
  |-------------|---------|----------|
  | code        | number  | 错误码   |
  | message     | string  | 提示信息 |
  | suggestions | array   | 优化建议 |

- **错误响应示例**

```json
{
  "code": 1006,
  "message": "AI服务异常"
}
```

#### `POST /api/ai/analyze` 代码质量分析

- **请求参数** 同上
- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | score     | number  | 质量评分 |
  | issues    | array   | 问题列表 |

- **错误响应示例**

```json
{
  "code": 1001,
  "message": "代码内容不能为空"
}
```

---

### 4. 协作与实时通信

#### `WebSocket /ws/project/:id` 实时协作通道

- **消息类型与字段**
  - `edit`：
    - userId (uuid, 必填)
    - fileId (uuid, 必填)
    - range (object, 必填)
    - text (string, 必填)
  - `cursor`：
    - userId (uuid, 必填)
    - fileId (uuid, 必填)
    - position (object, 必填)
  - `comment`：
    - userId (uuid, 必填)
    - fileId (uuid, 必填)
    - line (number, 必填)
    - content (string, 必填)
  - `status`：
    - userId (uuid, 必填)
    - online (boolean, 必填)
- **错误响应**

```json
{
  "code": 1002,
  "message": "未授权"
}
```

---

### 5. 版本管理

#### `GET /api/project/:id/file/:fileId/versions` 获取文件历史版本

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | versions  | array   | 版本列表 |

  - versionId (uuid)
  - timestamp (string)
  - author (string)
- **错误响应示例**

```json
{
  "code": 1004,
  "message": "文件不存在"
}
```

#### `GET /api/project/:id/file/:fileId/diff?from=xxx&to=yyy` 获取diff对比

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | diff      | string  | diff内容 |

- **错误响应示例**

```json
{
  "code": 1001,
  "message": "参数缺失"
}
```

#### `POST /api/project/:id/file/:fileId/rollback` 回滚到指定版本

- **请求参数**

  | 字段      | 类型    | 必填 | 校验规则           |
  |-----------|---------|------|--------------------|
  | versionId | uuid    | 是   |                    |

- **响应参数**

  | 字段      | 类型    | 说明     |
  |-----------|---------|----------|
  | code      | number  | 错误码   |
  | message   | string  | 提示信息 |
  | success   | boolean | 是否成功 |

- **错误响应示例**

```json
{
  "code": 1003,
  "message": "权限不足"
}
```

---

## 九、主要业务流程图

### 1. AI代码生成超级详细流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as 前端
    participant BE as 后端
    participant AI as OpenAI API
    U->>FE: 在AI助手输入需求/注释
    FE->>FE: 校验输入
    FE->>BE: 发送生成请求（prompt, language, context）
    BE->>BE: 权限校验、参数校验
    BE->>AI: 调用OpenAI API
    AI-->>BE: 返回代码片段和解释
    BE->>BE: 记录生成日志
    BE-->>FE: 返回代码片段和解释
    FE->>FE: 展示生成结果
    FE->>U: 用户可选择插入/优化/放弃
```

### 2. 多人协作编辑超级详细流程

```mermaid
sequenceDiagram
    participant U1 as 用户A
    participant U2 as 用户B
    participant FE1 as 前端A
    participant FE2 as 前端B
    participant BE as 后端
    U1->>FE1: 编辑代码
    FE1->>BE: 发送编辑操作（WebSocket）
    BE->>BE: 校验权限、合并操作
    BE->>FE2: 广播编辑操作
    FE2->>U2: 实时同步内容
    U2->>FE2: 编辑代码
    FE2->>BE: 发送编辑操作
    BE->>FE1: 广播编辑操作
    FE1->>U1: 实时同步内容
    Note over BE,FE1: 光标、评论、成员状态同步同理
    Note over FE1,FE2: 光标、评论、成员状态同步同理
```

### 3. 版本管理与diff超级详细流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as 前端
    participant BE as 后端
    U->>FE: 查看历史版本
    FE->>BE: 获取版本列表
    BE-->>FE: 返回版本列表
    U->>FE: 选择两个版本进行diff
    FE->>BE: 请求diff数据（from, to）
    BE->>BE: 计算diff
    BE-->>FE: 返回diff结果
    FE-->>U: 展示diff对比
    U->>FE: 选择回滚到某版本
    FE->>BE: 发送回滚请求
    BE->>BE: 校验权限、回滚数据
    BE-->>FE: 返回回滚结果
    FE-->>U: 展示回滚结果
```

### 4. 系统权限与项目权限关系梳理

```mermaid
graph TD
    %% 用户权限部分
    A[用户注册] -->|系统权限分配| B{系统权限}
    B -->|Admin| C[系统管理员]
    B -->|Editor/Viewer| D[普通用户]

    %% 系统管理员权限
    C -->|可以| C1[管理所有项目]
    C -->|可以| C2[分配项目权限]
    C -->|可以| C3[操作所有项目]

    %% 普通用户权限
    D -->|只能| D1[查看被分配的项目]
    D --> E[项目权限分配]

    %% 项目权限说明
    E -->|项目A| F[项目Viewer权限]
    E -->|项目B| G[项目Editor权限]
    E -->|项目C| H[项目Admin权限]

    %% 项目权限具体操作
    F -->|只能| F1[查看项目A]
    G -->|可以| G1[编辑项目B]
    H -->|可以| H1[管理项目C]

    %% 样式设置
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#f96,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
    style C1 fill:#f96,stroke:#333,stroke-width:2px
    style C2 fill:#f96,stroke:#333,stroke-width:2px
    style C3 fill:#f96,stroke:#333,stroke-width:2px
    style F fill:#dfd,stroke:#333,stroke-width:2px
    style G fill:#dfd,stroke:#333,stroke-width:2px
    style H fill:#dfd,stroke:#333,stroke-width:2px

    %% 权限说明
    subgraph 系统权限说明
        S1[系统Admin权限<br/>可以操作所有项目]
        S2[其他系统权限<br/>受项目权限限制]
    end
```

---

## 十、非功能性需求

- 高可用性与稳定性
- 数据安全与隐私保护
- 良好的扩展性与可维护性
- 兼容主流浏览器

---

## 十一、里程碑与交付计划

1. 需求评审与原型设计
2. 核心功能开发（AI生成、协作编辑、版本管理）
3. 内测与优化
4. 正式上线

---

如需进一步细化某一部分（如API接口更详细示例、流程图扩展等），请随时告知！

## 十二、详细权限模型

本平台采用简洁的三种权限体系：Viewer、Editor、Admin。新用户默认为Viewer权限。

| 功能/操作           | Viewer | Editor | Admin |
|---------------------|:------:|:------:|:-----:|
| 浏览项目/文件       | ✓      | ✓      | ✓     |
| 编辑文件内容        |        | ✓      | ✓     |
| 新建/删除文件       |        | ✓      | ✓     |
| AI代码生成/分析     |        | ✓      | ✓     |
| 版本回滚            |        | ✓      | ✓     |
| 评论/协作           |        | ✓      | ✓     |
| 邀请/移除成员       |        |        | ✓     |
| 变更成员权限        |        |        | ✓     |
| 删除项目            |        |        | ✓     |

- **Viewer**：仅可浏览项目、文件和历史版本。
- **Editor**：可编辑、创建、删除文件，使用AI功能，协作评论，版本回滚。
- **Admin**：拥有全部权限，包括成员管理、权限分配、项目删除。

> 注意：权限与成员管理功能只对Admin权限用户可见和可操作。系统中仅有这三种权限，无其他角色设定。

---

## 十三、API安全与限流说明

### 1. 鉴权与安全机制

- **JWT（JSON Web Token）**：所有需要身份认证的API均需在Header中携带`Authorization: Bearer <token>`，后端校验token有效性。
- **HTTPS**：所有API通信均要求HTTPS，防止中间人攻击和数据泄露。
- **权限校验**：后端根据token中的用户身份和权限，校验每个接口的访问权限。
- **敏感操作二次确认**：如删除项目、回滚版本等高风险操作，前端需弹窗确认，后端可要求二次验证（如再次输入密码或验证码，视实际需求可选）。

### 2. 接口限流策略

- **全局限流**：如每个IP每分钟不超过100次请求，防止恶意刷接口。
- **用户级限流**：如每个用户每分钟不超过60次AI生成请求，防止滥用AI资源。
- **AI接口专属限流**：AI相关接口（如`/api/ai/generate`）可单独设置更严格的限流策略。
- **异常检测与封禁**：对频繁触发限流或异常行为的IP/账号，自动临时封禁并告警。

### 3. 其他安全建议

- **CSRF防护**：对Web端敏感操作接口增加CSRF Token校验。
- **输入校验与防注入**：所有输入参数后端严格校验，防止SQL/NoSQL注入、XSS等攻击。
- **操作日志与审计**：关键操作（如权限变更、删除项目）需记录操作日志，便于追溯。

## 项目结构

```
backend/
  ├── src/
  │   ├── modules/
  │   │   ├── user/
  │   │   ├── project/
  │   │   └── module/
  │   └── ...
  └── ...
frontend/
  └── ...
docs/
  └── ...
```

## 用户模型设计

### 数据结构

```typescript
interface User {
  // 基础信息
  id: string;
  username: string;
  email: string;
  password: string;

  // 系统权限
  systemPermission: 'admin' | 'editor' | 'viewer';

  // 项目权限列表
  projectPermissions: {
    projectId: string;    // 项目ID
    projectName: string;  // 项目名称
    permission: 'admin' | 'editor' | 'viewer';
  }[];

  // 功能模块列表（用于前端展示）
  modules: {
    moduleId: string;      // 模块ID
    moduleName: string;    // 模块名称
    modulePath: string;    // 模块路径
    moduleIcon?: string;   // 模块图标
    moduleOrder: number;   // 模块排序
    children?: {          // 子模块
      moduleId: string;
      moduleName: string;
      modulePath: string;
      moduleIcon?: string;
      moduleOrder: number;
    }[];
  }[];
}
```

### 字段说明

1. **系统权限 (systemPermission)**
   - 类型：枚举值
   - 可选值：'admin' | 'editor' | 'viewer'
   - 说明：
     - admin：可以访问所有功能模块，可以分配用户权限
     - editor：可以访问被分配的功能模块，可以编辑内容
     - viewer：只能查看被分配的功能模块

2. **项目权限列表 (projectPermissions)**
   - 类型：数组
   - 结构：

     ```typescript
     {
       projectId: string;    // 项目ID
       projectName: string;  // 项目名称
       permission: string;   // 项目权限级别
     }
     ```

   - 说明：存储用户对各个项目的权限

3. **功能模块列表 (modules)**
   - 类型：数组
   - 结构：

     ```typescript
     {
       moduleId: string;      // 模块ID
       moduleName: string;    // 模块名称
       modulePath: string;    // 模块路径
       moduleIcon?: string;   // 模块图标
       moduleOrder: number;   // 模块排序
       children?: {          // 子模块
         moduleId: string;
         moduleName: string;
         modulePath: string;
         moduleIcon?: string;
         moduleOrder: number;
       }[];
     }
     ```

   - 说明：用于前端展示的模块列表，包含模块的基本信息和层级结构

### 数据结构示例

```typescript
// 用户数据示例
const user = {
  id: "user123",
  username: "张三",
  email: "zhangsan@example.com",
  password: "hashedPassword",
  systemPermission: "editor",

  // 项目权限
  projectPermissions: [
    {
      projectId: "projectA",
      projectName: "项目A",
      permission: "viewer"
    },
    {
      projectId: "projectB",
      projectName: "项目B",
      permission: "editor"
    },
    {
      projectId: "projectC",
      projectName: "项目C",
      permission: "admin"
    }
  ],

  // 功能模块列表
  modules: [
    {
      moduleId: "dashboard",
      moduleName: "仪表盘",
      modulePath: "/dashboard",
      moduleIcon: "dashboard",
      moduleOrder: 1
    },
    {
      moduleId: "project",
      moduleName: "项目管理",
      modulePath: "/project",
      moduleIcon: "project",
      moduleOrder: 2,
      children: [
        {
          moduleId: "project-list",
          moduleName: "项目列表",
          modulePath: "/project/list",
          moduleIcon: "list",
          moduleOrder: 1
        },
        {
          moduleId: "project-settings",
          moduleName: "项目设置",
          modulePath: "/project/settings",
          moduleIcon: "settings",
          moduleOrder: 2
        }
      ]
    },
    {
      moduleId: "user",
      moduleName: "用户管理",
      modulePath: "/user",
      moduleIcon: "user",
      moduleOrder: 3
    }
  ]
};
```

### 权限检查逻辑

1. **系统权限检查**

   ```typescript
   function checkSystemPermission(user: User, requiredPermission: string): boolean {
     return user.systemPermission === 'admin' || user.systemPermission === requiredPermission;
   }
   ```

2. **项目权限检查**

   ```typescript
   function checkProjectPermission(user: User, projectId: string, requiredPermission: string): boolean {
     // 系统管理员拥有所有权限
     if (user.systemPermission === 'admin') return true;

     const projectPermission = user.projectPermissions.find(p => p.projectId === projectId);
     return projectPermission?.permission === requiredPermission;
   }
   ```

3. **功能模块权限检查**

   ```typescript
   function checkModulePermission(user: User, moduleId: string, requiredPermission: string): boolean {
     // 系统管理员拥有所有权限
     if (user.systemPermission === 'admin') return true;

     // 根据系统权限判断
     switch (user.systemPermission) {
       case 'admin':
         return true;
       case 'editor':
         return requiredPermission !== 'admin'; // editor不能执行admin操作
       case 'viewer':
         return requiredPermission === 'viewer'; // viewer只能查看
       default:
         return false;
     }
   }
   ```

4. **获取用户可访问的模块列表**

   ```typescript
   function getUserAccessibleModules(user: User): Module[] {
     // 系统管理员可以访问所有模块
     if (user.systemPermission === 'admin') {
       return user.modules;
     }

     // 根据系统权限过滤模块
     return user.modules.filter(module => {
       // 检查模块权限
       const hasAccess = checkModulePermission(user, module.moduleId, user.systemPermission);

       // 如果有子模块，递归检查子模块权限
       if (module.children) {
         module.children = module.children.filter(child =>
           checkModulePermission(user, child.moduleId, user.systemPermission)
         );
       }

       return hasAccess;
     });
   }
   ```

## 权限体系说明

详细的权限体系说明请参考 [权限体系文档](docs/user-project-permission-flow.md)
