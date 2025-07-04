import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  ParseIntPipe,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Logger } from 'src/utils/utils';
import { CompanyService, ICompany } from './company.service';
import { ZodValidationPipe } from 'src/service/zod.validation.pipe';
import { CompanySchema } from './company.validation.schema';

@Controller('user/company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}
  // Define your endpoints here

  @Post('create')
  public async createCompany(
    @Body() companyData: ICompany,
    @Res() res: Response,
  ) {
    //to validate data
    const validationPipe = new ZodValidationPipe(CompanySchema, res);
    if (!validationPipe.transform(companyData, { type: 'body' })) {
      Logger.getInstance().error(
        'CompanyController :: createCompany :: Validation failed',
      );
      return;
    }
    const response = await this.companyService.createCompany(companyData);

    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.message || 'Failed to create company',
        error: response.error,
      });
      Logger.getInstance().error(
        'CompanyController :: createCompany :: Failed to create company: ' +
          response.error,
      );
      return;
    }
    res.status(201).json(response);
    Logger.getInstance().logSuccess(
      'CompanyController :: createCompany :: Successfully created company',
    );
    return;
  }

  @Put('update')
  public async updateCompany(
    @Body() companyData: ICompany,
    @Res() res: Response,
  ) {
    //to validate data
    const validationPipe = new ZodValidationPipe(CompanySchema, res);
    if (!validationPipe.transform(companyData, { type: 'body' })) {
      Logger.getInstance().error(
        'CompanyController :: updateCompany :: Validation failed',
      );
      return;
    }
    const response = await this.companyService.updateCompany(companyData);

    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.message || 'Failed to update company',
        error: response.error,
      });
      Logger.getInstance().error(
        'CompanyController :: updateCompany :: Failed to update company: ' +
          response.error,
      );
      return;
    }
    res.status(200).json(response);
    Logger.getInstance().logSuccess(
      'CompanyController :: updateCompany :: Successfully updated company',
    );
    return;
  }
  
  @Put('update-notification-settings')
  public async updateNotificationSettings(
    @Param('company_id', ParseIntPipe) company_id: number,
    @Param('user_id', ParseIntPipe) user_id: number,
    @Body()
    notificationSettings: {
      email_notifications?: boolean;
      sms_notifications?: boolean;
      invoice_reminders?: boolean;
      payment_alerts?: boolean;
      report_updates?: boolean;
    },
    @Res() res: Response,
  ) {
    const response = await this.companyService.updateNotificationSettings(
      Number(company_id),
      Number(user_id),
      notificationSettings.email_notifications ,
      notificationSettings.sms_notifications,
      notificationSettings.invoice_reminders,
      notificationSettings.payment_alerts,
      notificationSettings.report_updates,
    );

    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.message || 'Failed to update notification settings',
        error: response.error,
      });
      Logger.getInstance().error(
        'CompanyController :: updateNotificationSettings :: Failed to update notification settings: ' +
          response.error,
      );
      return;
    }
    res.status(200).json(response);
    Logger.getInstance().logSuccess(
      'CompanyController :: updateNotificationSettings :: Successfully updated notification settings',
    );
    return;
  }

  @Put('update-subscription')
  public async updateCompanySubscription(@Res() res: Response) {
    //pending API
    const response = await this.companyService.updateCompanySubscription();
    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.message || 'Failed to update company subscription',
        error: response.error,
      });
      Logger.getInstance().error(
        'CompanyController :: updateCompanySubscription :: Failed to update company subscription: ' +
          response.error,
      );
      return;
    }
    res.status(200).json(response);
    Logger.getInstance().logSuccess(
      'CompanyController :: updateCompanySubscription :: Successfully updated company subscription',
    );
    return;
  }

  @Get('get/:company_id')
  public async getCompany(
    @Param('company_id', ParseIntPipe) company_id: number,
    @Res() res: Response,
  ) {
    const response = await this.companyService.getCompany(company_id);
    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.message || 'Failed to retrieve company',
        error: response.error,
      });
      Logger.getInstance().error(
        'CompanyController :: getCompany :: Failed to retrieve company: ' +
          response.error,
      );
      return;
    }
    Logger.getInstance().logSuccess(
      'CompanyController :: getCompany :: Successfully retrieved company',
    );
    return response;
  }
}
