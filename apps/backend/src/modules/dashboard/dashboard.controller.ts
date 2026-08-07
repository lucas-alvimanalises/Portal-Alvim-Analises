import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
