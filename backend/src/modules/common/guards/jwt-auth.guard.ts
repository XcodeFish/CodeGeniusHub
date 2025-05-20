import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT认证守卫 (用于HTTP请求)
 * 继承自 @nestjs/passport 的 AuthGuard('jwt')
 * 负责从HTTP请求中提取JWT并触发Passport-JWT策略进行验证
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * 覆盖 getRequest 方法，以便从 HTTP 请求上下文中获取请求对象。
   * Passport AuthGuard 默认期望的是 Express/Fastify 的 Request 对象，
   * 此处确保获取到正确的上下文。
   * @param context - 执行上下文
   * @returns HTTP 请求对象
   */
  getRequest(context: ExecutionContext) {
    // 切换到HTTP上下文并获取请求对象
    return context.switchToHttp().getRequest();
  }

  /**
   * 覆盖 handleRequest 方法，用于处理 Passport 验证的结果。
   * 如果验证失败 (发生错误或用户不存在)，抛出 UnauthorizedException。
   * 如果验证成功，返回用户对象。
   * @param err - 验证过程中发生的错误
   * @param user - Passport Strategy 验证成功返回的用户对象
   * @param info - 验证信息
   * @returns 验证成功的用户对象
   * @throws UnauthorizedException - 认证失败时抛出
   */
  handleRequest(err, user, info) {
    // 如果发生错误或用户对象不存在，则认证失败
    if (err || !user) {
      // 可以根据 info 的内容提供更详细的错误信息，例如 token 过期等
      // 但通常情况下，直接抛出 UnauthorizedException 已经足够，或者在异常过滤器中统一处理
      throw err || new UnauthorizedException('身份验证失败，请重新登录');
    }
    // 认证成功，返回用户对象 (通常是JWT Payload)
    return user;
  }

  /**
   * canActivate 方法是 CanActivate 接口的要求。
   * AuthGuard 会自动处理验证逻辑，所以这里只需调用父类的 canActivate 方法。
   * @param context - 执行上下文
   * @returns 是否允许继续执行 (boolean 或 Promise/Observable)
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // 调用父类的 canActivate 方法，它会触发 Passport Strategy
    return super.canActivate(context);
  }
}
