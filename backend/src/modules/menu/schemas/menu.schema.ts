import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Menu extends Document {
  @Prop({ required: true, unique: true })
  moduleId: string;

  @Prop({ required: true })
  moduleName: string;

  @Prop({ required: true })
  modulePath: string;

  @Prop()
  moduleIcon?: string;

  @Prop({ required: true })
  moduleOrder: number;

  @Prop({ default: null })
  parentId: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];
}

export const MenuSchema = SchemaFactory.createForClass(Menu);
