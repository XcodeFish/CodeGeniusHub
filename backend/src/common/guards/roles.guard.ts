import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator'; // 引入装饰器中定义的KEY
import { Permission } from '../../modules/user/schemas/user.schema'; // 引入权限枚举

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

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
  canActivate(context: ExecutionContext): boolean {
    // 获取路由上设置的roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果路由没有设置roles，则表示不需要特定权限，允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息，拒绝访问
    if (!user || !user[this.USER_PERMISSION_FIELD]) {
      this.logger.warn(`无效的用户权限: ${user?.userId}`);
      return false;
    }

    const userPermission = user[this.USER_PERMISSION_FIELD];

    // 记录权限检查日志
    this.logger.debug(
      `权限检查: 用户[${user.userId}]-[${userPermission}], 要求角色[${requiredRoles.join(',')}]`,
    );

    // 1. Admin 权限可以访问任何需要权限的路由
    if (userPermission === Permission.ADMIN) {
      return true;
    }

    // 2. 检查用户权限是否满足要求
    const hasPermission = this.checkPermission(userPermission, requiredRoles);

    // 记录访问拒绝日志
    if (!hasPermission) {
      this.logger.warn(
        `权限不足: 用户[${user.userId}]-[${userPermission}], 要求角色[${requiredRoles.join(',')}]`,
      );
    }

    return hasPermission;
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
