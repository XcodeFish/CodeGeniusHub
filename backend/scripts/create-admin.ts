// backend/scripts/create-admin.ts

/**
 * 脚本功能：自动注册一个admin权限账号
 * 账号信息：
 *   - 用户名：admin
 *   - 邮箱：admin@bytehive.club
 *   - 手机号：13211223344
 *   - 权限：admin
 *   - 密码：admin123
 * 已存在则跳过，不重复创建
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User, Permission } from '../src/modules/user/schemas/user.schema';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  // 创建Nest应用
  const app = await NestFactory.createApplicationContext(AppModule);

  // 获取User模型
  const userModel = app.get(getModelToken(User.name));

  // 账号信息
  const adminInfo = {
    username: 'admin',
    email: 'admin@bytehive.club',
    phone: '13211223344',
    password: 'admin123',
    permission: Permission.ADMIN,
    firstLogin: false,
  };

  // 检查是否已存在
  const exist = await userModel.findOne({
    $or: [
      { username: adminInfo.username },
      { email: adminInfo.email },
      { phone: adminInfo.phone },
    ],
  });

  if (exist) {
    console.log('管理员账号已存在，跳过创建。');

    // ====== 如需覆盖账号，取消下方注释 ======
    await userModel.deleteOne({ _id: exist._id });
    await userModel.create(adminInfo);
    console.log('管理员账号已覆盖重建。');
    // =======================================

    await app.close();
    process.exit(0);
  }

  // 密码加密
  // const hashedPassword = await bcrypt.hash(adminInfo.password, 10);

  // 创建新用户
  await userModel.create(adminInfo);

  console.log('管理员账号创建成功：');
  console.log(`用户名: ${adminInfo.username}`);
  console.log(`邮箱: ${adminInfo.email}`);
  console.log(`手机号: ${adminInfo.phone}`);
  console.log(`初始密码: ${adminInfo.password}`);
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('创建管理员账号失败：', err);
  process.exit(1);
});
