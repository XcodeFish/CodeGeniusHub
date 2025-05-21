import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from '../../common/common.module';

// 引入权限守卫和装饰器（如果需要全局提供，可以在 app.module.ts 里用 APP_GUARD）
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Module({
  imports: [
    // 注册 Mongoose 的 User 模型
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CommonModule, // 导入CommonModule以便使用PermissionService
  ],
  controllers: [UserController],
  providers: [
    UserService,
    // 如果需要在本模块内全局守卫，可以这样提供
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [UserService], // 允许其他模块（如auth）复用UserService
})
export class UserModule {}
