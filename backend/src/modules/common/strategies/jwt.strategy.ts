// backend/src/modules/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../constants/constants';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../user/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  // validate 方法会在 JWT 验证通过后被调用，payload 是解码后的 token 内容
  async validate(payload: any) {
    // payload 通常包含 sub (用户ID), username, permission 等信息
    const user = await this.userModel.findById(payload.sub).select('-password'); // 查找用户，但不返回密码
    if (!user) {
      throw new UnauthorizedException('用户不存在或 token 无效');
    }
    // 返回的用户对象会附加到请求对象上 (req.user)
    return {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      permission: user.permission,
    };
  }
}
