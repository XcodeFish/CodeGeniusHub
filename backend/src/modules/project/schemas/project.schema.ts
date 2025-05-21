import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User, Permission } from '@/modules/user/schemas/user.schema';

export type ProjectDocument = HydratedDocument<Project>;

// 项目成员结构
export class ProjectMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({
    type: String,
    enum: Permission,
    default: Permission.VIEWER,
    required: true,
  })
  permission: Permission;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;
}

const ProjectMemberSchema = new MongooseSchema(
  {
    userId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permission: {
      type: String,
      enum: Object.values(Permission),
      default: Permission.VIEWER,
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: User;

  @Prop({
    type: [ProjectMemberSchema],
    default: [],
    validate: [(v) => Array.isArray(v), '{PATH} should be an array'],
  })
  members: ProjectMember[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: '', trim: true })
  repositoryUrl: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  filesCount: number;

  @Prop({ default: 0 })
  collaboratorsCount: number;

  @Prop({ default: Date.now })
  lastActivityAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// 索引定义
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ name: 1, createdBy: 1 }, { unique: true }); // 同一用户不能创建同名项目
ProjectSchema.index({ 'members.userId': 1 }); // 加速查询用户参与的项目
