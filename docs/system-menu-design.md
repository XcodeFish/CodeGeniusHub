# 系统菜单设计文档

## 一、菜单接口设计

### 1. 获取菜单接口

- **接口路径**：`GET /api/user/menus`
- **请求参数**：无（通过JWT Token识别用户身份和权限）
- **响应格式**：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "moduleId": "dashboard",
      "moduleName": "仪表盘",
      "modulePath": "/dashboard",
      "moduleIcon": "dashboard",
      "moduleOrder": 1
    },
    {
      "moduleId": "project",
      "moduleName": "项目管理",
      "modulePath": "/project",
      "moduleIcon": "project",
      "moduleOrder": 2,
      "children": [
        {
          "moduleId": "project-list",
          "moduleName": "项目列表",
          "modulePath": "/project/list",
          "moduleIcon": "list",
          "moduleOrder": 1
        },
        {
          "moduleId": "project-create",
          "moduleName": "创建项目",
          "modulePath": "/project/create",
          "moduleIcon": "plus",
          "moduleOrder": 2
        }
      ]
    }
  ]
}
```

- **错误码**：
  - `0`：成功
  - `1002`：未授权/Token无效
  - `1003`：权限不足

### 2. 菜单权限处理

- 后端根据用户的系统权限（Admin/Editor/Viewer）动态过滤并返回相应菜单
- 系统管理员（Admin）可见所有菜单项
- 普通用户（Editor/Viewer）仅可见被分配的功能模块对应的菜单项

## 二、菜单参数设计

### 1. 菜单项字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| moduleId | string | 是 | 模块唯一标识，前后端统一，用于权限控制 |
| moduleName | string | 是 | 模块名称，用于显示 |
| modulePath | string | 是 | 模块路径，用于前端路由跳转 |
| moduleIcon | string | 否 | 模块图标，使用Ant Design图标名称 |
| moduleOrder | number | 是 | 模块排序，数字越小越靠前 |
| children | array | 否 | 子模块列表，结构与父模块相同 |

### 2. 菜单层级设计

- **一级菜单**：主要功能模块，如仪表盘、项目管理、AI助手等
- **二级菜单**：主要功能模块的子功能，如项目列表、创建项目等
- **最多支持两级菜单**：保持界面简洁清晰，避免层级过深导致用户体验下降

## 三、系统菜单规划

### 1. 核心功能菜单

#### 所有用户可见（根据权限过滤）

1. **仪表盘**
   - moduleId: "dashboard"
   - moduleName: "仪表盘"
   - modulePath: "/dashboard"
   - moduleIcon: "dashboard"
   - moduleOrder: 1

2. **项目管理**
   - moduleId: "project"
   - moduleName: "项目管理"
   - modulePath: "/project"
   - moduleIcon: "project"
   - moduleOrder: 2
   - children:
     - 项目列表
     - 创建项目（Admin和Editor可见）
     - 我参与的项目

3. **代码编辑器**
   - moduleId: "editor"
   - moduleName: "代码编辑器"
   - modulePath: "/editor"
   - moduleIcon: "code"
   - moduleOrder: 3
   - children:
     - 最近编辑
     - 收藏文件

4. **AI助手**
   - moduleId: "ai"
   - moduleName: "AI助手"
   - modulePath: "/ai"
   - moduleIcon: "robot"
   - moduleOrder: 4
   - children:
     - 代码生成
     - 代码优化
     - 代码分析
     - AI对话

5. **版本管理**
   - moduleId: "version"
   - moduleName: "版本管理"
   - modulePath: "/version"
   - moduleIcon: "branch"
   - moduleOrder: 5

6. **文档中心**
   - moduleId: "docs"
   - moduleName: "文档中心"
   - modulePath: "/docs"
   - moduleIcon: "file-text"
   - moduleOrder: 6
   - children:
     - 使用指南
     - 常见问题
     - API文档

#### 仅管理员可见

7. **用户管理**
   - moduleId: "user"
   - moduleName: "用户管理"
   - modulePath: "/user"
   - moduleIcon: "user"
   - moduleOrder: 7
   - children:
     - 用户列表
     - 角色权限

8. **系统设置**
   - moduleId: "settings"
   - moduleName: "系统设置"
   - modulePath: "/settings"
   - moduleIcon: "setting"
   - moduleOrder: 8
   - children:
     - 基础设置
     - AI配置
     - 日志审计

### 2. 完整菜单结构示例

```json
[
  {
    "moduleId": "dashboard",
    "moduleName": "仪表盘",
    "modulePath": "/dashboard",
    "moduleIcon": "dashboard",
    "moduleOrder": 1
  },
  {
    "moduleId": "project",
    "moduleName": "项目管理",
    "modulePath": "/project",
    "moduleIcon": "project",
    "moduleOrder": 2,
    "children": [
      {
        "moduleId": "project-list",
        "moduleName": "项目列表",
        "modulePath": "/project/list",
        "moduleIcon": "unordered-list",
        "moduleOrder": 1
      },
      {
        "moduleId": "project-create",
        "moduleName": "创建项目",
        "modulePath": "/project/create",
        "moduleIcon": "plus",
        "moduleOrder": 2
      },
      {
        "moduleId": "project-my",
        "moduleName": "我参与的项目",
        "modulePath": "/project/my",
        "moduleIcon": "team",
        "moduleOrder": 3
      }
    ]
  },
  {
    "moduleId": "editor",
    "moduleName": "代码编辑器",
    "modulePath": "/editor",
    "moduleIcon": "code",
    "moduleOrder": 3,
    "children": [
      {
        "moduleId": "editor-recent",
        "moduleName": "最近编辑",
        "modulePath": "/editor/recent",
        "moduleIcon": "clock-circle",
        "moduleOrder": 1
      },
      {
        "moduleId": "editor-favorites",
        "moduleName": "收藏文件",
        "modulePath": "/editor/favorites",
        "moduleIcon": "star",
        "moduleOrder": 2
      }
    ]
  },
  {
    "moduleId": "ai",
    "moduleName": "AI助手",
    "modulePath": "/ai",
    "moduleIcon": "robot",
    "moduleOrder": 4,
    "children": [
      {
        "moduleId": "ai-generate",
        "moduleName": "代码生成",
        "modulePath": "/ai/generate",
        "moduleIcon": "code",
        "moduleOrder": 1
      },
      {
        "moduleId": "ai-optimize",
        "moduleName": "代码优化",
        "modulePath": "/ai/optimize",
        "moduleIcon": "tool",
        "moduleOrder": 2
      },
      {
        "moduleId": "ai-analyze",
        "moduleName": "代码分析",
        "modulePath": "/ai/analyze",
        "moduleIcon": "audit",
        "moduleOrder": 3
      },
      {
        "moduleId": "ai-chat",
        "moduleName": "AI对话",
        "modulePath": "/ai/chat",
        "moduleIcon": "message",
        "moduleOrder": 4
      }
    ]
  },
  {
    "moduleId": "version",
    "moduleName": "版本管理",
    "modulePath": "/version",
    "moduleIcon": "branch",
    "moduleOrder": 5
  },
  {
    "moduleId": "docs",
    "moduleName": "文档中心",
    "modulePath": "/docs",
    "moduleIcon": "file-text",
    "moduleOrder": 6,
    "children": [
      {
        "moduleId": "docs-guide",
        "moduleName": "使用指南",
        "modulePath": "/docs/guide",
        "moduleIcon": "book",
        "moduleOrder": 1
      },
      {
        "moduleId": "docs-faq",
        "moduleName": "常见问题",
        "modulePath": "/docs/faq",
        "moduleIcon": "question-circle",
        "moduleOrder": 2
      },
      {
        "moduleId": "docs-api",
        "moduleName": "API文档",
        "modulePath": "/docs/api",
        "moduleIcon": "api",
        "moduleOrder": 3
      }
    ]
  },
  {
    "moduleId": "user",
    "moduleName": "用户管理",
    "modulePath": "/user",
    "moduleIcon": "user",
    "moduleOrder": 7,
    "children": [
      {
        "moduleId": "user-list",
        "moduleName": "用户列表",
        "modulePath": "/user/list",
        "moduleIcon": "team",
        "moduleOrder": 1
      },
      {
        "moduleId": "user-role",
        "moduleName": "角色权限",
        "modulePath": "/user/role",
        "moduleIcon": "safety-certificate",
        "moduleOrder": 2
      }
    ]
  },
  {
    "moduleId": "settings",
    "moduleName": "系统设置",
    "modulePath": "/settings",
    "moduleIcon": "setting",
    "moduleOrder": 8,
    "children": [
      {
        "moduleId": "settings-basic",
        "moduleName": "基础设置",
        "modulePath": "/settings/basic",
        "moduleIcon": "tool",
        "moduleOrder": 1
      },
      {
        "moduleId": "settings-ai",
        "moduleName": "AI配置",
        "modulePath": "/settings/ai",
        "moduleIcon": "cloud",
        "moduleOrder": 2
      },
      {
        "moduleId": "settings-log",
        "moduleName": "日志审计",
        "modulePath": "/settings/log",
        "moduleIcon": "file-search",
        "moduleOrder": 3
      }
    ]
  }
]
```

## 四、前端菜单实现建议

### 1. 菜单Store设计

```typescript
// stores/menuStore.ts
import { create } from 'zustand';

export const useMenuStore = create((set) => ({
  menus: [],
  loading: false,
  setMenus: (menus) => set({ menus }),
  setLoading: (loading) => set({ loading }),
}));
```

### 2. 菜单Hook设计

```typescript
// hooks/useMenu.ts
import { useEffect } from 'react';
import { useMenuStore } from '@/stores/menuStore';
import axios from 'axios';

export function useMenu() {
  const { menus, loading, setMenus, setLoading } = useMenuStore();

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/user/menus');
      if (res.data.code === 0) {
        setMenus(res.data.data);
      }
    } catch (error) {
      console.error('获取菜单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return { menus, loading, fetchMenus };
}
```

### 3. Layout中菜单渲染示例

```tsx
// components/Layout/SideMenu.tsx
import { useMenu } from '@/hooks/useMenu';
import { Menu } from 'antd';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as Icons from '@ant-design/icons';

export default function SideMenu() {
  const { menus, loading, fetchMenus } = useMenu();
  const router = useRouter();

  useEffect(() => {
    fetchMenus();
  }, []);

  const renderIcon = (iconName) => {
    const Icon = Icons[iconName];
    return Icon ? <Icon /> : null;
  };

  const renderMenuItems = (menuItems) => {
    return menuItems.map(item => {
      if (item.children && item.children.length > 0) {
        return (
          <Menu.SubMenu
            key={item.moduleId}
            title={item.moduleName}
            icon={renderIcon(item.moduleIcon)}
          >
            {renderMenuItems(item.children)}
          </Menu.SubMenu>
        );
      }
      return (
        <Menu.Item
          key={item.moduleId}
          icon={renderIcon(item.moduleIcon)}
          onClick={() => router.push(item.modulePath)}
        >
          {item.moduleName}
        </Menu.Item>
      );
    });
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[router.pathname]}
      style={{ height: '100%' }}
      theme="dark"
    >
      {loading ? <Menu.Item key="loading">加载中...</Menu.Item> : renderMenuItems(menus)}
    </Menu>
  );
}
```

## 五、后端实现建议

### 1. 菜单模型设计

```typescript
// 菜单模型
interface MenuModule {
  moduleId: string;
  moduleName: string;
  modulePath: string;
  moduleIcon?: string;
  moduleOrder: number;
  children?: MenuModule[];
  permissions?: string[]; // 哪些权限可以访问此菜单，如['admin','editor']
}

// 数据库表设计
interface MenuDocument {
  _id: string;
  moduleId: string;
  moduleName: string;
  modulePath: string;
  moduleIcon?: string;
  moduleOrder: number;
  parentId?: string; // 父菜单ID，null表示一级菜单
  permissions: string[]; // 权限列表
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 菜单服务实现

```typescript
// menu.service.ts
@Injectable()
export class MenuService {
  constructor(@InjectModel('Menu') private menuModel) {}

  // 获取用户可见菜单
  async getUserMenus(userPermission: string): Promise<MenuModule[]> {
    // 1. 获取所有菜单
    const allMenus = await this.menuModel.find().sort({ moduleOrder: 1 }).lean();

    // 2. 根据用户权限过滤菜单
    const filteredMenus = allMenus.filter(menu =>
      menu.permissions.includes(userPermission) || userPermission === 'admin'
    );

    // 3. 构建菜单树
    return this.buildMenuTree(filteredMenus);
  }

  // 构建菜单树
  private buildMenuTree(menus: any[], parentId: string = null): MenuModule[] {
    const result = [];

    for (const menu of menus) {
      if (menu.parentId === parentId) {
        const children = this.buildMenuTree(menus, menu._id);

        const menuItem: MenuModule = {
          moduleId: menu.moduleId,
          moduleName: menu.moduleName,
          modulePath: menu.modulePath,
          moduleIcon: menu.moduleIcon,
          moduleOrder: menu.moduleOrder
        };

        if (children.length > 0) {
          menuItem.children = children;
        }

        result.push(menuItem);
      }
    }

    return result;
  }
}
```

### 3. 菜单控制器实现

```typescript
// menu.controller.ts
@Controller('api/user')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('menus')
  @UseGuards(JwtAuthGuard)
  async getUserMenus(@Request() req): Promise<any> {
    const userPermission = req.user.systemPermission;
    const menus = await this.menuService.getUserMenus(userPermission);

    return {
      code: 0,
      message: 'success',
      data: menus
    };
  }
}
```

## 六、小结与建议

1. **动态菜单的优势**
   - 提高系统的灵活性和可维护性
   - 支持根据用户权限进行菜单过滤
   - 便于后期扩展和调整菜单结构

2. **菜单分级建议**
   - 一级菜单：主要功能模块
   - 二级菜单：具体功能子项
   - 不建议使用三级以上菜单，保持界面简洁

3. **权限控制建议**
   - 菜单权限与系统权限紧密结合
   - Admin可见所有菜单
   - Editor/Viewer根据功能模块权限限制菜单可见性

4. **前端性能优化**
   - 菜单数据缓存到localStorage
   - 优化菜单渲染，减少不必要的刷新
   - 实现菜单的懒加载
