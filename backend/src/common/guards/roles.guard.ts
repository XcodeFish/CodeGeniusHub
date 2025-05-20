import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator'; // 引入装饰器中定义的KEY

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // 新增权限字段名常量
  private readonly USER_PERMISSION_FIELD = 'permission';

  canActivate(context: ExecutionContext): boolean {
    // 获取路由上设置的roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // 如果路由没有设置roles，则表示不需要特定权限，允许访问
    if (!requiredRoles) {
      return true;
    }

    // 获取当前用户，这里假设JwtAuthGuard已经将用户信息附加到req.user
    // 你可能需要根据你的实际实现调整这里的类型和属性访问
    const { user } = context.switchToHttp().getRequest();

    // 检查用户是否有所需的roles中的任意一个
    // 这里假设用户权限存储在 user.permission 属性中
    // 你可能需要根据你的实际用户对象结构调整这里的逻辑
    return requiredRoles.some(
      (role) => user[this.USER_PERMISSION_FIELD] === role,
    );
  }
}
