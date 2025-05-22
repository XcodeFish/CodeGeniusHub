import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuDto {
  @ApiProperty({ description: '模块ID' })
  @IsString()
  moduleId: string;

  @ApiProperty({ description: '模块名称' })
  @IsString()
  moduleName: string;

  @ApiProperty({ description: '模块路径' })
  @IsString()
  modulePath: string;

  @ApiPropertyOptional({ description: '模块图标' })
  @IsOptional()
  @IsString()
  moduleIcon?: string;

  @ApiProperty({ description: '模块排序' })
  @IsNumber()
  moduleOrder: number;

  @ApiPropertyOptional({ description: '父模块ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: '权限列表' })
  @IsArray()
  permissions: string[];
}

export class MenuResponseDto {
  @ApiProperty({ description: '错误码' })
  code: number;

  @ApiProperty({ description: '提示信息' })
  message: string;

  @ApiProperty({ description: '菜单数据' })
  data: MenuTreeDto[];
}

export class MenuTreeDto {
  @ApiProperty({ description: '模块ID' })
  moduleId: string;

  @ApiProperty({ description: '模块名称' })
  moduleName: string;

  @ApiProperty({ description: '模块路径' })
  modulePath: string;

  @ApiPropertyOptional({ description: '模块图标' })
  moduleIcon?: string;

  @ApiProperty({ description: '模块排序' })
  moduleOrder: number;

  @ApiPropertyOptional({ description: '子菜单', type: [MenuTreeDto] })
  children?: MenuTreeDto[];
}
