import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway';
import { FileModule } from '../file/file.module';
import { ProjectModule } from '../project/project.module';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FileModule, ProjectModule, CommonModule, AuthModule],
  providers: [CollaborationGateway],
  exports: [CollaborationGateway],
})
export class CollaborationModule {}
