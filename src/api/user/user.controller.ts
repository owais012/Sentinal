import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  Res,
} from '@nestjs/common';

import { UserService, User } from './user.service';
import { Response } from 'express';
import { ApiResponse } from '../../types/types';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

    @Get(':user_id')
    async GetUserById(
        @Param('user_id', ParseIntPipe) userId: number,
        @Res() res: Response,
    ) {
        const serviceResult = await this.userService.GetUserById(userId);
        if (!serviceResult.success) {
            const statusCode =
                serviceResult.error === 'USER_NOT_FOUND'
                ? HttpStatus.NOT_FOUND
                : HttpStatus.INTERNAL_SERVER_ERROR;

            const response =
                serviceResult.error === 'USER_NOT_FOUND'
                ? ApiResponse.notFound<User>(
                    serviceResult.message || 'User not found',
                    `/user/${userId}`,
                    )
                : ApiResponse.error<User>(
                    serviceResult.message || 'Internal server error',
                    serviceResult.error,
                    `/user/${userId}`,
                    );
            res.status(statusCode).json(response);
            return;
        }

        res
        .status(HttpStatus.OK)
        .json(
            ApiResponse.success(
            serviceResult.data,
            serviceResult.message,
            `/user/${userId}`,
            ),
        );
        }

    @Post('create')
    async createUser(@Body() userData: User, @Res() res: Response) {
        const serviceResult = await this.userService.createUser(userData);

        if (!serviceResult.success) {
        // Handle different error types
        const statusCode = serviceResult.error?.includes('already exists')
            ? HttpStatus.CONFLICT
            : HttpStatus.BAD_REQUEST;

        const response = serviceResult.error?.includes('already exists')
            ? ApiResponse.conflict<User>(
                serviceResult.message || 'User already exists',
                '/user',
            )
            : ApiResponse.badRequest<User>(
                serviceResult.message || 'Failed to create user',
                '/user',
            );

        res.status(statusCode).json(response);
        return;
        }

        res
        .status(HttpStatus.CREATED)
        .json(
            ApiResponse.created(serviceResult.data, serviceResult.message, '/user'),
        );
        return;
    }
  
    @Get()
    async getAllUsers(
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 10,
        @Res() res: Response,
    ) {
        const serviceResult = await this.userService.getAllUsers(page, limit);

        if (!serviceResult.success) {

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(ApiResponse.error<User[]>(
            serviceResult.message || 'Failed to fetch users',
            serviceResult.error,
            '/user'));
            
            return;
        }

        return res.status(HttpStatus.OK).json(ApiResponse.success(
            serviceResult.data,
            serviceResult.message || 'Users retrieved successfully',
            '/user',
        ));
    }

    public async getUserCompanies(
        @Param('user_id', ParseIntPipe) userId: number,
        @Res() res: Response,
    ) {
        const serviceResult = await this.userService.getUserCompanies(userId);

        if (!serviceResult.success) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(ApiResponse.error(
                serviceResult.message || 'Failed to fetch user companies',
                serviceResult.error,
                `/user/${userId}/companies`,
            ));
            return;
        }

        return res.status(HttpStatus.OK).json(ApiResponse.success(
            serviceResult.data,
            serviceResult.message || 'User companies retrieved successfully',
            `/user/${userId}/companies`,
        ));
    }
}
