import { MenuItem } from '@/stores/menuStore';

/**
 * 系统默认菜单数据
 * 从后端代码迁移过来，按用户权限分组
 */
export const defaultMenus: Record<string, MenuItem[]> = {
  // 所有用户都可以看到的菜单
  common: [
    // 仪表盘
    {
      moduleId: 'dashboard',
      moduleName: '仪表盘',
      modulePath: '/dashboard',
      moduleIcon: 'Dashboard',
      moduleOrder: 1,
      children: []
    },

    // 项目管理
    {
      moduleId: 'project',
      moduleName: '项目管理',
      modulePath: '/project',
      moduleIcon: 'Project',
      moduleOrder: 2,
      children: [
        {
          moduleId: 'project-list',
          moduleName: '项目列表',
          modulePath: '/project/list',
          moduleIcon: 'UnorderedList',
          moduleOrder: 1,
          children: []
        },
        {
          moduleId: 'project-my',
          moduleName: '我参与的项目',
          modulePath: '/project/my',
          moduleIcon: 'Team',
          moduleOrder: 3,
          children: []
        }
      ]
    },

    // 代码编辑器
    {
      moduleId: 'editor',
      moduleName: '代码编辑器',
      modulePath: '/editor',
      moduleIcon: 'Code',
      moduleOrder: 3,
      children: [
        {
          moduleId: 'editor-recent',
          moduleName: '最近编辑',
          modulePath: '/editor/recent',
          moduleIcon: 'ClockCircle',
          moduleOrder: 1,
          children: []
        },
        {
          moduleId: 'editor-favorites',
          moduleName: '收藏文件',
          modulePath: '/editor/favorites',
          moduleIcon: 'Star',
          moduleOrder: 2,
          children: []
        }
      ]
    },

    // 版本管理
    {
      moduleId: 'version',
      moduleName: '版本管理',
      modulePath: '/version',
      moduleIcon: 'HistoryOutlined',
      moduleOrder: 5,
      children: []
    },

    // 文档中心
    {
      moduleId: 'docs',
      moduleName: '文档中心',
      modulePath: '/docs',
      moduleIcon: 'FileText',
      moduleOrder: 6,
      children: [
        {
          moduleId: 'docs-guide',
          moduleName: '使用指南',
          modulePath: '/docs/guide',
          moduleIcon: 'Book',
          moduleOrder: 1,
          children: []
        },
        {
          moduleId: 'docs-faq',
          moduleName: '常见问题',
          modulePath: '/docs/faq',
          moduleIcon: 'QuestionCircle',
          moduleOrder: 2,
          children: []
        },
        {
          moduleId: 'docs-api',
          moduleName: 'API文档',
          modulePath: '/docs/api',
          moduleIcon: 'Api',
          moduleOrder: 3,
          children: []
        }
      ]
    }
  ],

  // editor和admin可用的菜单
  editorAndAdmin: [
    // 创建项目
    {
      moduleId: 'project-create',
      moduleName: '创建项目',
      modulePath: '/project/create',
      moduleIcon: 'Plus',
      moduleOrder: 2,
      parentId: 'project',
      children: []
    },

    // AI助手
    {
      moduleId: 'ai',
      moduleName: 'AI助手',
      modulePath: '/ai',
      moduleIcon: 'Robot',
      moduleOrder: 4,
      children: [
        {
          moduleId: 'ai-generate',
          moduleName: '代码生成',
          modulePath: '/ai/generate',
          moduleIcon: 'Code',
          moduleOrder: 1,
          children: []
        },
        {
          moduleId: 'ai-optimize',
          moduleName: '代码优化',
          modulePath: '/ai/optimize',
          moduleIcon: 'Tool',
          moduleOrder: 2,
          children: []
        },
        {
          moduleId: 'ai-analyze',
          moduleName: '代码分析',
          modulePath: '/ai/analyze',
          moduleIcon: 'Audit',
          moduleOrder: 3,
          children: []
        },
        {
          moduleId: 'ai-chat',
          moduleName: 'AI对话',
          modulePath: '/ai/chat',
          moduleIcon: 'Message',
          moduleOrder: 4,
          children: []
        },
        {
          moduleId: 'ai-ollama',
          moduleName: 'Ollama测试',
          modulePath: '/ollama-test',
          moduleIcon: 'CloudServer',
          moduleOrder: 5,
          children: []
        }
      ]
    }
  ],

  // 仅admin可用的菜单
  adminOnly: [
    // 系统设置
    {
      moduleId: 'system',
      moduleName: '系统设置',
      modulePath: '/system',
      moduleIcon: 'Setting',
      moduleOrder: 7,
      children: [
        {
          moduleId: 'system-users',
          moduleName: '用户管理',
          modulePath: '/system/users',
          moduleIcon: 'User',
          moduleOrder: 1,
          children: []
        },
        {
          moduleId: 'system-logs',
          moduleName: '系统日志',
          modulePath: '/system/logs',
          moduleIcon: 'FileText',
          moduleOrder: 2,
          children: []
        },
        {
          moduleId: 'system-ai-config',
          moduleName: 'AI配置',
          modulePath: '/system/ai-config',
          moduleIcon: 'CloudServer',
          moduleOrder: 3,
          children: []
        },
        {
          moduleId: 'system-prompt-templates',
          moduleName: '提示词模板',
          modulePath: '/system/prompt-templates',
          moduleIcon: 'FileText',
          moduleOrder: 4,
          children: []
        },
        {
          moduleId: 'system-ai-stats',
          moduleName: 'AI使用统计',
          modulePath: '/system/ai-stats',
          moduleIcon: 'BarChart',
          moduleOrder: 5,
          children: []
        }
      ]
    }
  ]
}; 