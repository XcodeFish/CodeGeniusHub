// 用户 Mongoose Model 定义
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  email: string; // 注册邮箱，唯一必填

  @Prop({ required: true, unique: true })
  phone: string; // 手机号

  @Prop({ required: true })
  passwordHash: string; // 密码哈希

  @Prop({ required: true, unique: true })
  username: string; // 用户名

  @Prop({ default: 'Viewer' })
  role: string; // 用户权限， 'Viewer', 'Admin' 'Editor' 三种

  @Prop({ default: true })
  firstLogin: boolean; // 是否首次登录

  // 其他用户相关字段...
}

export const UserSchema = SchemaFactory.createForClass(User);

// 可以添加索引等配置
UserSchema.index({ email: 1 });
