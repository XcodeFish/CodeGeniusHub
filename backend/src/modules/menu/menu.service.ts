import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Menu } from './schemas/menu.schema';
import { MenuTreeDto } from './dto/menu.dto';

interface MongoDocument {
  _id: Types.ObjectId;
  [key: string]: any;
}

@Injectable()
export class MenuService implements OnModuleInit {
  constructor(@InjectModel(Menu.name) private menuModel: Model<Menu>) {}

  // 在模块初始化时自动创建默认菜单
  async onModuleInit() {
    const count = await this.menuModel.countDocuments();
    // 只有当数据库中没有菜单时，才创建默认菜单
    if (count === 0) {
      await this.createDefaultMenus();
    }
  }

  // 根据用户系统权限获取可见菜单
  async getUserMenus(userPermission: string): Promise<MenuTreeDto[]> {
    // 获取所有菜单
    const allMenus = await this.menuModel
      .find()
      .sort({ moduleOrder: 1 })
      .lean();

    // 根据用户权限过滤菜单
    // admin可以看到所有菜单，其他用户只能看到权限列表包含自己权限的菜单
    const filteredMenus = allMenus.filter(
      (menu) =>
        menu.permissions.includes(userPermission) || userPermission === 'admin',
    );

    // 构建菜单树
    return this.buildMenuTree(filteredMenus);
  }

  // 构建菜单树
  private buildMenuTree(
    menus: any[],
    parentId: string | null = null,
  ): MenuTreeDto[] {
    const result: MenuTreeDto[] = [];

    for (const menu of menus) {
      if (String(menu.parentId) === String(parentId)) {
        const children = this.buildMenuTree(menus, menu._id.toString());

        const menuItem: MenuTreeDto = {
          moduleId: menu.moduleId,
          moduleName: menu.moduleName,
          modulePath: menu.modulePath,
          moduleIcon: menu.moduleIcon,
          moduleOrder: menu.moduleOrder,
        };

        if (children.length > 0) {
          menuItem.children = children;
        }

        result.push(menuItem);
      }
    }

    return result;
  }

  // 创建默认菜单
  async createDefaultMenus() {
    const defaultMenus = [
      // 仪表盘（所有权限可见）
      {
        moduleId: 'dashboard',
        moduleName: '仪表盘',
        modulePath: '/dashboard',
        moduleIcon: 'dashboard',
        moduleOrder: 1,
        parentId: null,
        permissions: ['admin', 'editor', 'viewer'],
      },

      // 项目管理（所有权限可见）
      {
        moduleId: 'project',
        moduleName: '项目管理',
        modulePath: '/project',
        moduleIcon: 'project',
        moduleOrder: 2,
        parentId: null,
        permissions: ['admin', 'editor', 'viewer'],
      },
      {
        moduleId: 'project-list',
        moduleName: '项目列表',
        modulePath: '/project/list',
        moduleIcon: 'unordered-list',
        moduleOrder: 1,
        parentId: 'project',
        permissions: ['admin', 'editor', 'viewer'],
      },
      {
        moduleId: 'project-create',
        moduleName: '创建项目',
        modulePath: '/project/create',
        moduleIcon: 'plus',
        moduleOrder: 2,
        parentId: 'project',
        permissions: ['admin', 'editor'], // 只有admin和editor可以创建项目
      },
      {
        moduleId: 'project-my',
        moduleName: '我参与的项目',
        modulePath: '/project/my',
        moduleIcon: 'team',
        moduleOrder: 3,
        parentId: 'project',
        permissions: ['admin', 'editor', 'viewer'],
      },

      // 代码编辑器（所有权限可见，但viewer只能查看）
      {
        moduleId: 'editor',
        moduleName: '代码编辑器',
        modulePath: '/editor',
        moduleIcon: 'code',
        moduleOrder: 3,
        parentId: null,
        permissions: ['admin', 'editor', 'viewer'],
      },
      {
        moduleId: 'editor-recent',
        moduleName: '最近编辑',
        modulePath: '/editor/recent',
        moduleIcon: 'clock-circle',
        moduleOrder: 1,
        parentId: 'editor',
        permissions: ['admin', 'editor', 'viewer'],
      },
      {
        moduleId: 'editor-favorites',
        moduleName: '收藏文件',
        modulePath: '/editor/favorites',
        moduleIcon: 'star',
        moduleOrder: 2,
        parentId: 'editor',
        permissions: ['admin', 'editor', 'viewer'],
      },

      // AI助手（editor和admin可用）
      {
        moduleId: 'ai',
        moduleName: 'AI助手',
        modulePath: '/ai',
        moduleIcon: 'robot',
        moduleOrder: 4,
        parentId: null,
        permissions: ['admin', 'editor'], // 只有admin和editor可以使用AI助手
      },
      {
        moduleId: 'ai-generate',
        moduleName: '代码生成',
        modulePath: '/ai/generate',
        moduleIcon: 'code',
        moduleOrder: 1,
        parentId: 'ai',
        permissions: ['admin', 'editor'],
      },
      {
        moduleId: 'ai-optimize',
        moduleName: '代码优化',
        modulePath: '/ai/optimize',
        moduleIcon: 'tool',
        moduleOrder: 2,
        parentId: 'ai',
        permissions: ['admin', 'editor'],
      },
      {
        moduleId: 'ai-analyze',
        moduleName: '代码分析',
        modulePath: '/ai/analyze',
        moduleIcon: 'audit',
        moduleOrder: 3,
        parentId: 'ai',
        permissions: ['admin', 'editor'],
      },
      {
        moduleId: 'ai-chat',
        moduleName: 'AI对话',
        modulePath: '/ai/chat',
        moduleIcon: 'message',
        moduleOrder: 4,
        parentId: 'ai',
        permissions: ['admin', 'editor'],
      },

      // 版本管理（所有权限可见）
      {
        moduleId: 'version',
        moduleName: '版本管理',
        modulePath: '/version',
        moduleIcon: 'branch',
        moduleOrder: 5,
        parentId: null,
        permissions: ['admin', 'editor', 'viewer'],
      },

      // 文档中心（所有权限可见）
      {
        moduleId: 'docs',
        moduleName: '文档中心',
        modulePath: '/docs',
        moduleIcon: 'file-text',
        moduleOrder: 6,
        parentId: null,
        permissions: ['admin', 'editor', 'viewer'],
      },
      {
        moduleId: 'docs-guide',
        moduleName: '使用指南',
        modulePath: '/docs/guide',
        moduleIcon: 'book',
        moduleOrder: 1,
        parentId: 'docs',
        permissions: ['admin', 'editor', 'viewer'],
      },
      {
        moduleId: 'docs-faq',
        moduleName: '常见问题',
        modulePath: '/docs/faq',
        moduleIcon: 'question-circle',
        moduleOrder: 2,
        parentId: 'docs',
        permissions: ['admin', 'editor', 'viewer'],
      },
      {
        moduleId: 'docs-api',
        moduleName: 'API文档',
        modulePath: '/docs/api',
        moduleIcon: 'api',
        moduleOrder: 3,
        parentId: 'docs',
        permissions: ['admin', 'editor', 'viewer'],
      },

      // 用户管理（仅admin可见）
      {
        moduleId: 'user',
        moduleName: '用户管理',
        modulePath: '/user',
        moduleIcon: 'user',
        moduleOrder: 7,
        parentId: null,
        permissions: ['admin'], // 只有admin可以管理用户
      },
      {
        moduleId: 'user-list',
        moduleName: '用户列表',
        modulePath: '/user/list',
        moduleIcon: 'team',
        moduleOrder: 1,
        parentId: 'user',
        permissions: ['admin'],
      },
      {
        moduleId: 'user-role',
        moduleName: '角色权限',
        modulePath: '/user/role',
        moduleIcon: 'safety-certificate',
        moduleOrder: 2,
        parentId: 'user',
        permissions: ['admin'],
      },

      // 系统设置（仅admin可见）
      {
        moduleId: 'settings',
        moduleName: '系统设置',
        modulePath: '/settings',
        moduleIcon: 'setting',
        moduleOrder: 8,
        parentId: null,
        permissions: ['admin'], // 只有admin可以访问系统设置
      },
      {
        moduleId: 'settings-basic',
        moduleName: '基础设置',
        modulePath: '/settings/basic',
        moduleIcon: 'tool',
        moduleOrder: 1,
        parentId: 'settings',
        permissions: ['admin'],
      },
      {
        moduleId: 'settings-ai',
        moduleName: 'AI配置',
        modulePath: '/settings/ai',
        moduleIcon: 'cloud',
        moduleOrder: 2,
        parentId: 'settings',
        permissions: ['admin'],
      },
      {
        moduleId: 'settings-log',
        moduleName: '日志审计',
        modulePath: '/settings/log',
        moduleIcon: 'file-search',
        moduleOrder: 3,
        parentId: 'settings',
        permissions: ['admin'],
      },
    ];

    try {
      // 创建父菜单，记录ID映射
      const parentMenus = defaultMenus.filter((menu) => menu.parentId === null);
      const idMappings: Record<string, string> = {};

      for (const menu of parentMenus) {
        const createdMenu = await this.menuModel.create(menu);
        // 使用类型断言解决_id类型问题
        const docWithId = createdMenu as unknown as MongoDocument;
        idMappings[menu.moduleId] = docWithId._id.toString();
      }

      // 创建子菜单，并关联到父菜单ID
      const childMenus = defaultMenus.filter((menu) => menu.parentId !== null);
      for (const menu of childMenus) {
        if (idMappings[menu.parentId]) {
          const childMenu = { ...menu, parentId: idMappings[menu.parentId] };
          await this.menuModel.create(childMenu);
        }
      }

      return true;
    } catch (error) {
      console.error('创建默认菜单失败:', error);
      return false;
    }
  }
}
