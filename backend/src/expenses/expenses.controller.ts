import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private roleOf(user: any) {
    return user?.role?.name || user?.role || '';
  }

  private assertCanUseExpenses(user: any) {
    const r = this.roleOf(user);
    if (['SUPER_ADMIN', 'ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'ACCOUNTANT'].includes(r)) {
      return;
    }
    throw new ForbiddenException('Not allowed to access Expenses');
  }

  @Get('party-options')
  listPartyOptions(@Req() req: any) {
    this.assertCanUseExpenses(req.user);
    return this.expensesService.listPartyOptions();
  }

  @Get('funds')
  listFunds(@Query('plantId') plantId: string, @Req() req: any) {
    this.assertCanUseExpenses(req.user);
    return this.expensesService.listFunds(plantId);
  }

  @Post('funds')
  createFund(@Body() body: any, @Req() req: any) {
    return this.expensesService.createFund(body, req.user);
  }

  @Get('entries')
  listExpenses(@Query('plantId') plantId: string, @Req() req: any) {
    this.assertCanUseExpenses(req.user);
    return this.expensesService.listExpenses(plantId);
  }

  @Post('entries')
  createExpense(@Body() body: any, @Req() req: any) {
    this.assertCanUseExpenses(req.user);
    if (Array.isArray(body?.lines)) {
      return this.expensesService.createExpenses(body, req.user);
    }
    return this.expensesService.createExpense(body, req.user);
  }

  @Get('petty-cashbook')
  pettyCashbook(
    @Query('plantId') plantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: any,
  ) {
    this.assertCanUseExpenses(req?.user);
    return this.expensesService.compactSummary(plantId, from, to);
  }

  @Get('day-book')
  dayBook(
    @Query('plantId') plantId: string,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    this.assertCanUseExpenses(req.user);
    return this.expensesService.dayBook(plantId, date);
  }

  @Get('day-books')
  dayBooks(
    @Query('plantId') plantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    this.assertCanUseExpenses(req.user);
    return this.expensesService.dayBooks(plantId, from, to);
  }

  @Get('compact-summary')
  compactSummary(
    @Query('plantId') plantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: any,
  ) {
    this.assertCanUseExpenses(req?.user);
    return this.expensesService.compactSummary(plantId, from, to);
  }

  @Get('mill-wise-chart')
  millWiseChart(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: any,
  ) {
    this.assertCanUseExpenses(req?.user);
    return this.expensesService.millWiseExpenseChart(from, to);
  }

  @Get('tickets')
  listTickets(@Query('plantId') plantId: string | undefined, @Req() req: any) {
    this.assertCanUseExpenses(req.user);
    return this.expensesService.listTickets(plantId || undefined);
  }

  @Get('supervisors')
  listSupervisors(@Req() req: any) {
    this.assertCanUseExpenses(req.user);
    return this.expensesService.listSupervisors();
  }

  @Post('tickets')
  createTicket(@Body() body: any, @Req() req: any) {
    return this.expensesService.createTicket(body, req.user);
  }

  @Patch('tickets/:id')
  updateTicket(@Param('id') id: string, @Body() body: { status: string }, @Req() req: any) {
    return this.expensesService.updateTicketStatus(id, body.status, req.user);
  }
}
