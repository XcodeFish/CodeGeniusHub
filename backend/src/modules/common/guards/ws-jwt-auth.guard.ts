import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

// 简单的 WebSocket JWT 守卫示例
@Injectable()
export class WsJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const client = context.switchToWs().getClient();
    // 假设 token 在客户端连接时的 auth 字段中
    const token = client.handshake.auth.token;
    if (!token) {
      throw new UnauthorizedException('未提供身份验证 token');
    }
    // 将 token 放入 headers 中，以便 Passport-JWT Strategy 可以提取
    return { headers: { authorization: `Bearer ${token}` } };
  }

  // 如果验证失败，Passport-JWT 会抛出 UnauthorizedException
  // 你可以覆盖 this.handleRequest 来实现自定义错误处理
  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('身份验证失败');
    }
    return user;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
