// src/modules/project/project.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Project, ProjectSchema } from './schemas/project.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema }, // 引入User模型，用于成员管理
    ]),
    CommonModule, // 导入CommonModule以使用PermissionService
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService], // 导出ProjectService以便其他模块使用
})
export class ProjectModule {}
