import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Model } from 'mongoose';

export type PromptType =
  | 'generate'
  | 'analyze'
  | 'optimize'
  | 'chat'
  | 'explain';

export interface IPromptTemplate {
  name: string;
  description: string;
  template: string;
  type: PromptType;
  tags: string[];
  isSystem: boolean;
  isActive: boolean;
}

@Schema({ timestamps: true })
export class PromptTemplate implements IPromptTemplate {
  @Prop({
    required: true,
    validate: {
      validator: function (v: string) {
        return v.length >= 2 && v.length <= 50;
      },
      message: '模板名称长度必须在2-50个字符之间',
    },
  })
  name: string;

  @Prop({
    required: true,
    validate: {
      validator: function (v: string) {
        return v.length >= 10 && v.length <= 200;
      },
      message: '模板描述长度必须在10-200个字符之间',
    },
  })
  description: string;

  @Prop({
    required: true,
    validate: {
      validator: function (v: string) {
        return v.length >= 10 && v.length <= 5000;
      },
      message: '模板内容长度必须在10-5000个字符之间',
    },
  })
  template: string;

  @Prop({
    required: true,
    enum: ['generate', 'analyze', 'optimize', 'chat', 'explain'],
  })
  type: PromptType;

  @Prop({
    default: [],
    validate: {
      validator: function (v: string[]) {
        return v.every((tag) => tag.length >= 2 && tag.length <= 20);
      },
      message: '标签长度必须在2-20个字符之间',
    },
  })
  tags: string[];

  @Prop({
    default: false,
  })
  isSystem: boolean;

  @Prop({
    default: true,
  })
  isActive: boolean;
}

export type PromptTemplateDocument = HydratedDocument<PromptTemplate>;
export type PromptTemplateModel = Model<PromptTemplate>;
export const PromptTemplateSchema =
  SchemaFactory.createForClass(PromptTemplate);
