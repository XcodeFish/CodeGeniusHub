import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from '@/modules/user/schemas/user.schema';

export type FileVersionDocument = HydratedDocument<FileVersion>;

@Schema({ timestamps: true })
export class FileVersion {
  @Prop({ required: true })
  fileId: string;

  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 0 })
  size: number;

  @Prop({ default: 0 })
  versionNumber: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ default: '' })
  commitMessage: string;

  @Prop({ default: false })
  isRollback: boolean;

  @Prop({ type: String, default: null })
  rollbackFromVersion: string;
}

export const FileVersionSchema = SchemaFactory.createForClass(FileVersion);

// 索引定义
FileVersionSchema.index({ fileId: 1, versionNumber: 1 }, { unique: true }); // 同一文件的版本号唯一
FileVersionSchema.index({ fileId: 1 }); // 加速查询文件版本
FileVersionSchema.index({ projectId: 1 }); // 加速查询项目版本
FileVersionSchema.index({ createdBy: 1 }); // 查询用户创建的版本
