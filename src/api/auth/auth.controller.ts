import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Logger } from 'src/utils/utils';
import { Response } from 'express';
import { ApiResponse } from 'src/types/types';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('verify-email')
    public async verifyEmail(
        @Query('token') token: string,
        @Res() res: Response,
    ) {
        if (!token) {
            res.status(400).json(ApiResponse.error("Verification token is required"));
            Logger.getInstance().logError("verifyEmail:: Verification token is required");
            return;
        }

        const response = await this.authService.verifyEmail(token);
        if (!response.success) {
            Logger.getInstance().logError("verifyEmail:: Failed to Verify Email");
            res.status(500).json(ApiResponse.error(response.message || 'Failed to verify email', response.error));
            return;
        }
        Logger.getInstance().logSuccess("verifyEmail:: Email Verified Sucessfully");
        res.status(200).json(ApiResponse.success(response.data, response.message));
        return;
    }
              

    @Post('resend-verification')
    public async resendVerification(@Body('email') email: string, @Res() res: Response) {
        if(!email){
            res.status(400).json(ApiResponse.error("email is required"));
            Logger.getInstance().logError("resendVerification:: email is required");
            return;
        }  
        
        const response = await this.authService.resendVerificationEmail(email);
        if(!response.success){
            Logger.getInstance().logError("resendVerification:: Failed to resend Email");
            res.status(500).json(ApiResponse.error(response.message || 'Failed to verify email', response.error));
            return;
        }
        Logger.getInstance().logSuccess("resendVerification:: Email Verified Sucessfully");
        res.status(200).json(ApiResponse.success(response.data, response.message));
        return;
    }
    
}
