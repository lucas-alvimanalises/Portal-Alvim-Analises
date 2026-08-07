import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateScheduleDto } from '../application/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../application/dto/update-schedule.dto';
import { UpdateScheduleStatusDto } from '../application/dto/update-schedule-status.dto';
import { UpdateScheduleCommentsDto } from '../application/dto/update-schedule-comments.dto';
import { CreateScheduleUseCase } from '../application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from '../application/use-cases/list-schedules.use-case';
import { GetScheduleUseCase } from '../application/use-cases/get-schedule.use-case';
import { UpdateScheduleUseCase } from '../application/use-cases/update-schedule.use-case';
import { UpdateScheduleCommentsUseCase } from '../application/use-cases/update-schedule-comments.use-case';
import { UpdateScheduleStatusUseCase } from '../application/use-cases/update-schedule-status.use-case';
import { DeleteScheduleUseCase } from '../application/use-cases/delete-schedule.use-case';
import { SendScheduleToClientUseCase } from '../application/use-cases/send-schedule-to-client.use-case';
import { toScheduleDto } from '../application/schedule.mapper';
import { ScheduleDerivedStatusService } from '../application/schedule-derived-status.service';

@Controller('schedules')
@UseGuards(RolesGuard)
export class SchedulesController {
  constructor(
    private readonly createScheduleUseCase: CreateScheduleUseCase,
    private readonly listSchedulesUseCase: ListSchedulesUseCase,
    private readonly getScheduleUseCase: GetScheduleUseCase,
    private readonly updateScheduleUseCase: UpdateScheduleUseCase,
    private readonly updateScheduleCommentsUseCase: UpdateScheduleCommentsUseCase,
    private readonly updateScheduleStatusUseCase: UpdateScheduleStatusUseCase,
    private readonly deleteScheduleUseCase: DeleteScheduleUseCase,
    private readonly sendScheduleToClientUseCase: SendScheduleToClientUseCase,
    private readonly scheduleDerivedStatusService: ScheduleDerivedStatusService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query('clientId') clientId?: string) {
    const schedules = await this.listSchedulesUseCase.execute(user, clientId);
    const derivedStatuses = await this.scheduleDerivedStatusService.computeMany(schedules);
    return schedules.map((schedule) =>
      toScheduleDto(schedule, user.role, derivedStatuses[schedule.id]),
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const schedule = await this.getScheduleUseCase.execute(id, user);
    const derivedStatus = await this.scheduleDerivedStatusService.computeOne(schedule);
    return toScheduleDto(schedule, user.role, derivedStatus);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  async create(@Body() dto: CreateScheduleDto, @CurrentUser() user: AuthenticatedUser) {
    const schedule = await this.createScheduleUseCase.execute(dto);
    const derivedStatus = await this.scheduleDerivedStatusService.computeOne(schedule);
    return toScheduleDto(schedule, user.role, derivedStatus);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const schedule = await this.updateScheduleUseCase.execute(id, dto);
    const derivedStatus = await this.scheduleDerivedStatusService.computeOne(schedule);
    return toScheduleDto(schedule, user.role, derivedStatus);
  }

  @Patch(':id/comments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async updateComments(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleCommentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const schedule = await this.updateScheduleCommentsUseCase.execute(id, dto, user);
    const derivedStatus = await this.scheduleDerivedStatusService.computeOne(schedule);
    return toScheduleDto(schedule, user.role, derivedStatus);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const schedule = await this.updateScheduleStatusUseCase.execute(id, dto.status, user);
    const derivedStatus = await this.scheduleDerivedStatusService.computeOne(schedule);
    return toScheduleDto(schedule, user.role, derivedStatus);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.deleteScheduleUseCase.execute(id);
  }

  @Post(':id/send-to-client')
  @Roles(Role.ADMIN, Role.MANAGER)
  sendToClient(@Param('id') id: string) {
    return this.sendScheduleToClientUseCase.execute(id);
  }
}
