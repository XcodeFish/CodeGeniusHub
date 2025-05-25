import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator'; // 引入装饰器中定义的KEY
import { PermissionService } from '../services/permission.service';
import { Permission } from '../../modules/user/schemas/user.schema'; // 引入权限枚举

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  // 用户权限字段名常量
  private readonly USER_PERMISSION_FIELD = 'permission';

  // 权限等级映射，用于比较权限高低
  private readonly permissionLevels = {
    [Permission.ADMIN]: 3,
    [Permission.EDITOR]: 2,
    [Permission.VIEWER]: 1,
  };

  /**
   * 检查用户是否有权限访问路由
   * @param context 执行上下文
   * @returns 是否允许访问
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Permission[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有设置角色要求，默认放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user, params } = context.switchToHttp().getRequest();
    console.log('user', user, 'params', params);
    // 如果请求中没有用户信息，表示未认证
    if (!user || !user.userId) {
      throw new ForbiddenException('未授权访问');
    }

    // 检查是否系统管理员，系统管理员可以访问任何资源
    if (await this.permissionService.isSystemAdmin(user.userId)) {
      return true;
    }

    // 获取项目ID（如果有）
    const projectId = params.projectId || params.id;

    // 如果有项目ID，检查项目权限
    if (projectId) {
      const permission = await this.permissionService.getUserProjectPermission(
        user.userId,
        projectId,
      );

      // 检查是否包含所需权限
      return requiredRoles.some((role) => {
        if (role === Permission.VIEWER) {
          // 任何权限都可以查看
          return !!permission;
        } else if (role === Permission.EDITOR) {
          // 编辑者或管理员可以编辑
          return (
            permission === Permission.EDITOR || permission === Permission.ADMIN
          );
        } else if (role === Permission.ADMIN) {
          // 只有管理员可以管理
          return permission === Permission.ADMIN;
        }
        return false;
      });
    }

    // 如果没有项目ID，只检查系统权限
    const systemPermission =
      await this.permissionService.getUserSystemPermission(user.userId);

    return requiredRoles.some((role) => {
      if (role === Permission.VIEWER) {
        // 任何系统角色都可以查看
        return !!systemPermission;
      } else if (role === Permission.EDITOR) {
        // 编辑者或管理员可以编辑
        return (
          systemPermission === Permission.EDITOR ||
          systemPermission === Permission.ADMIN
        );
      } else if (role === Permission.ADMIN) {
        // 只有管理员可以管理
        return systemPermission === Permission.ADMIN;
      }
      return false;
    });
  }

  /**
   * 检查用户权限是否满足要求
   * @param userPermission 用户权限
   * @param requiredRoles 要求的角色列表
   * @returns 是否满足要求
   */
  private checkPermission(
    userPermission: string,
    requiredRoles: string[],
  ): boolean {
    const userLevel = this.permissionLevels[userPermission] || 0;

    return requiredRoles.some((role) => {
      // 1. 直接匹配：如果要求的角色就是用户当前角色，允许访问
      if (role === userPermission) {
        return true;
      }

      // 2. 权限等级比较：如果用户权限等级高于要求权限，也允许访问
      const requiredLevel = this.permissionLevels[role] || 0;
      return userLevel >= requiredLevel;
    });
  }
}
