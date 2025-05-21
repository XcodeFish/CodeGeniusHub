import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../modules/user/schemas/user.schema';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Permission[] | string[]) =>
  SetMetadata(ROLES_KEY, roles);
