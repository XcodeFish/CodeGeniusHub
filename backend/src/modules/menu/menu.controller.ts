import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { MenuService } from './menu.service';
import { MenuResponseDto } from './dto/menu.dto';

@ApiTags('菜单')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户菜单' })
  @ApiOkResponse({ description: '获取成功', type: MenuResponseDto })
  async getUserMenus(@Request() req): Promise<MenuResponseDto> {
    const userPermission = req.user.systemPermission;
    const menus = await this.menuService.getUserMenus(userPermission);

    return {
      code: 0,
      message: 'success',
      data: menus,
    };
  }
}
