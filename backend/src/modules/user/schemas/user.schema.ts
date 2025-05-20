import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

// 权限枚举
export enum Permission {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

@Schema({ timestamps: true }) // 添加时间戳，记录创建和更新时间
export class User {
  // 用户ID由MongoDB自动生成_id，这里不再显式定义uuid

  @Prop({ required: true, unique: true, index: true }) // 邮箱作为唯一索引
  email: string;

  @Prop({ required: true })
  password: string; // 存储加密后的密码

  @Prop({ required: true, unique: true, sparse: true }) // 用户名可选，但如果存在则唯一
  username: string;

  @Prop({ required: true, unique: true, sparse: true }) // 手机号可选，如果存在则唯一
  phone: string;

  @Prop({ required: true, default: Permission.VIEWER }) // 默认权限为Viewer
  permission: Permission;

  // 其他用户相关字段可以根据需要添加，例如头像、昵称等
  @Prop({ required: false })
  avatar?: string;

  @Prop({ required: false, default: true }) // 标记用户是否首次登录，用于新手引导
  firstLogin?: boolean;

  // 忘记密码验证码
  @Prop()
  forgotPasswordCode?: string;

  @Prop()
  forgotPasswordCodeExpires?: Date;

  // 用于管理 Refresh Token 的字段
  // 简单的示例：存储 refresh token 的 hash 或一个关联 ID
  // 更安全的做法是维护一个单独的 Refresh Token 集合，存储 token, userId, expiresAt, issuedAt 等
  @Prop()
  currentRefreshTokenHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 添加一个 pre-save hook 来处理密码加密
UserSchema.pre('save', async function (next) {
  const user = this as UserDocument;
  // 仅在密码被修改时重新哈希
  if (user.isModified('password')) {
    const bcrypt = require('bcrypt'); // 延迟加载 bcrypt
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

// 可能需要其他索引以优化查询
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ forgotPasswordCode: 1 }, { unique: true, sparse: true });
