import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Permission } from './user.schema';

export type PermissionLogDocument = PermissionLog & Document;

@Schema({ timestamps: true })
export class PermissionLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  adminId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: Permission })
  oldPermission: Permission;

  @Prop({ required: true, enum: Permission })
  newPermission: Permission;

  @Prop({ required: true, enum: ['system', 'project'] })
  permissionType: string;

  @Prop({ type: Types.ObjectId, index: true })
  projectId?: Types.ObjectId;

  @Prop({ required: true })
  timestamp: Date;
}

export const PermissionLogSchema = SchemaFactory.createForClass(PermissionLog);

// 添加复合索引提高查询性能
PermissionLogSchema.index({ userId: 1, timestamp: -1 });
PermissionLogSchema.index({ projectId: 1, timestamp: -1 });
