// backend/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '@/modules/user/schemas/user.schema';
import { Captcha, CaptchaSchema } from '@/shared/schemas/captcha.schema';
import { JwtStrategy } from '@/modules/common/strategies/jwt.strategy';
import { jwtConstants } from '@/modules/common/constants/constants';
// import { MailModule } from '../mail/mail.module'; // 如果有真实的邮件模块

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Captcha.name, schema: CaptchaSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }), // 注册 PassportModule 并设置默认策略
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.accessTokenExpiresIn },
    }),
    // MailModule, // 如果有真实的邮件模块，在这里导入
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule], // 导出以便其他模块使用 AuthGuard 或 JwtService
})
export class AuthModule {}
