import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionService } from './services/permission.service';
import { User, UserSchema } from '../modules/user/schemas/user.schema';
import {
  PermissionLog,
  PermissionLogSchema,
} from '../modules/user/schemas/permission-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PermissionLog.name, schema: PermissionLogSchema },
    ]),
  ],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class CommonModule {}
