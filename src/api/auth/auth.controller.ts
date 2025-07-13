import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { Logger } from 'src/utils/utils';
import { Response } from 'express';
import { ApiResponse } from 'src/types/types';
import { GoogleAuthService } from './google-auth.service';
import { UserService, User } from '../user/user.service';
import { error } from 'console';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly userService: UserService, // Assuming you have a UserService to handle user operations
  ) {}

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      const result = await this.authService.verifyEmail(token);

      if (result.success) {
        // Success - redirect to frontend
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/verify?status=success`,
        );
      }
    } catch (error) {
      // Handle different error scenarios
      if (error.message === 'TOKEN_EXPIRED') {
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/verify?status=error&reason=expired`,
        );
      }
      if (error.message === 'ALREADY_VERIFIED') {
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/verify?status=error&reason=already_verified`,
        );
      }
      if (error.message === 'INVALID_TOKEN') {
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/verify?status=error&reason=invalid_token`,
        );
      }

      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/verify?status=error&reason=server_error`,
      );
    }
  }

  @Get('verify-email')
  public async verifyEmailAndRedirect(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      res.status(400).json(ApiResponse.error('Verification token is required'));
      Logger.getInstance().logError(
        'verifyEmail:: Verification token is required',
      );
      return;
    }

    const response = await this.authService.verifyEmail(token);
    if (!response.success) {
      Logger.getInstance().logError('verifyEmail:: Failed to Verify Email');
      res
        .status(500)
        .json(
          ApiResponse.error(
            response.message || 'Failed to verify email',
            response.error,
          ),
        );
      return;
    }
    Logger.getInstance().logSuccess('verifyEmail:: Email Verified Sucessfully');
    res.status(200).json(ApiResponse.success(response.data, response.message));
    return;
  }

  @Post('resend-verification')
  public async resendVerification(
    @Body('email') email: string,
    @Res() res: Response,
  ) {
    if (!email) {
      res.status(400).json(ApiResponse.error('email is required'));
      Logger.getInstance().logError('resendVerification:: email is required');
      return;
    }
    const response = await this.authService.resendVerificationEmail(email);
    if (!response.success) {
      Logger.getInstance().logError(
        'resendVerification:: Failed to resend Email',
      );
      res
        .status(500)
        .json(
          ApiResponse.error(
            response.message || 'Failed to verify email',
            response.error,
          ),
        );
      return;
    }
    Logger.getInstance().logSuccess(
      'resendVerification:: Email Verified Sucessfully',
    );
    res.status(200).json(ApiResponse.success(response.data, response.message));
    return;
  }

  @Post('login')
  public async login(
    @Body() Authorization: { email: string; password: string },
    @Res() res: Response,
  ) {
    const { email, password } = Authorization;
    if (!email || !password) {
      res
        .status(400)
        .json(ApiResponse.error('Email and password are required'));
      Logger.getInstance().logError('login:: Email and password are required');
      return;
    }

    const response = await this.authService.login(email, password);
    if (!response.success) {
      Logger.getInstance().logError('login:: Failed to login');
      res
        .status(500)
        .json(
          ApiResponse.error(
            response.message || 'Failed to login',
            response.error,
          ),
        );
      return;
    }
    Logger.getInstance().logSuccess('login:: User logged in successfully');
    res.status(200).json(ApiResponse.success(response.data, response.message));
    return;
  }

  // auth.controller.ts
  @Post('google-signin')
  async googleSignIn(@Body() body: { credential: string }) {
    try {
      // Verify Google token
      const googleUser = await this.googleAuthService.verifyGoogleToken(
        body.credential,
      );

      if (!googleUser) {
        throw new BadRequestException('Invalid Google token');
      }

      const { email, given_name: name, sub: googleId } = googleUser;

      // Check if user exists
      if (!email) {
        throw new BadRequestException('Email is required from Google token');
      }
      let user = await this.userService.findByEmail(email);

      if (!user.success) {
        // Create new user
        user = await this.userService.createUser({
          full_name: name,
          email: email,
          phone_number: '',
          password_hash: '',
          google_id: googleId,
          is_verified: true, // Google emails are pre-verified
          is_active: true,
          is_deleted: false,
        } as User);
      } else {
        // Update existing user with Google data
        if (user && user.data && user.data.user_id) {
          await this.userService.updateUser(Number(user.data.user_id), {
            google_id: googleId,
            is_verified: true,
          });
        } else {
          Logger.getInstance().error(
            'googleSignIn :: User not found after Google authentication'+
            error);
          
          return {
            success: false,
            error: 'User not found after Google authentication',
            message: 'Failed to authenticate user with Google',
          }
        }
      }

      // Return user data (same format as regular login)
      return {
        success: true,
        data: user,
        message: 'User logged in successfully via Google',
      };
    } catch (error) {
      Logger.getInstance().error(
        'googleSignIn :: Error during Google sign-in: ' + error,
      );
      return {
        success: false,
        error: error.message || 'Google sign-in failed',
        message: 'Failed to authenticate user with Google',
      };
    }
  }
}
