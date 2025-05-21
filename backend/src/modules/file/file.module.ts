import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { File, FileSchema } from './schemas/file.schema';
import { FileVersion, FileVersionSchema } from './schemas/file-version.schema';
import { ProjectModule } from '../project/project.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: FileVersion.name, schema: FileVersionSchema },
    ]),
    ProjectModule,
    CommonModule,
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
