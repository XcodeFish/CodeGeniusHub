import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CaptchaDocument = HydratedDocument<Captcha>;

@Schema({ timestamps: true })
export class Captcha {
  @Prop({ required: true, unique: true, index: true })
  captchaId: string;

  @Prop({ required: true })
  text: string; // 改为 text 以匹配 svgCaptcha 输出

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean; // 是否已使用
}

export const CaptchaSchema = SchemaFactory.createForClass(Captcha);

// 添加过期索引，让 MongoDB 自动清理过期的验证码
CaptchaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
