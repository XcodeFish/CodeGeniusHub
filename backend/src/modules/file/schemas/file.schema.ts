import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from '@/modules/user/schemas/user.schema';

export type FileDocument = HydratedDocument<File>;

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true, trim: true })
  filename: string;

  @Prop({ required: true })
  projectId: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ default: 'text/plain' })
  mimeType: string;

  @Prop({ default: 0 })
  size: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  lastModifiedBy: User;

  @Prop({ default: Date.now })
  lastModifiedAt: Date;

  @Prop({ default: 0 })
  versionsCount: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: String, default: null })
  path: string;
}

export const FileSchema = SchemaFactory.createForClass(File);

// 索引定义
FileSchema.index({ projectId: 1, filename: 1 }, { unique: true }); // 同一项目中文件名唯一
FileSchema.index({ projectId: 1 }); // 加速查询项目文件
FileSchema.index({ createdBy: 1 }); // 查询用户创建的文件
FileSchema.index({ isDeleted: 1 }); // 查询删除状态
