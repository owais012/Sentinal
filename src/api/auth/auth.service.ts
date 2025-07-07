import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../../email/email.service';
import { Logger } from 'src/utils/utils';
import { ServiceResult } from 'src/types/types';

@Injectable()
export class AuthService {
    constructor(
        private readonly db: DatabaseService,
        @InjectRedis() private readonly redis: Redis,
        private readonly emailService: EmailService,
    ) {}

    public async verifyEmail(token: string):Promise<ServiceResult<any>> {
        try{
            const redisKey = `email_verification:${token}`;

            // Get user ID from Redis
            const userId = await this.redis.get(redisKey);
            if (!userId) {
                Logger.getInstance().logError('Invalid or expired verification token');
                return {
                    success: false,
                    message: 'Invalid or expired verification token',
                    error: 'INVALID_VERIFICATION_TOKEN',
                };
            }

            // Find user in database
            const getUserQuery = `
                SELECT 
                    user_id, 
                    email, 
                    is_verified 
                FROM users 
                WHERE user_id = ${userId}`;
            const userResult = await this.db.query(getUserQuery);

            if (userResult.rows.length === 0) {
                return {
                    success :false,
                    message : "user Not Found",
                    error : "USER_NOT_FOUND"
                }
            }

            const user = userResult.rows[0];

            if (user.is_verified) {
                Logger.getInstance().logError('Email is already verified');
                return {
                    success: false,
                    message: 'Email is already verified',
                    error: 'EMAIL_ALREADY_VERIFIED',
                };
            }

            // Mark user as verified
            const updateUserQuery = `
                UPDATE 
                    users 
                SET 
                is_verified = $1 
                WHERE user_id = $2
            `;
            await this.db.query(updateUserQuery, [true, userId]);

            // Delete token from Redis
            await this.redis.del(redisKey);

            return {
                success : true,
                data : null,
                message:"Emailed Verified Sucessfully"
            };

        }catch(error){
            Logger.getInstance().logError("verifyEmail:: Failed to Verify Email"+error);
            return {
                success:false,
                message:"Failed to Verify Email",
                error:error,
            }
        }
    }

    async resendVerificationEmail(email: string) {
        try{
        // Find user
            const getUserQuery =`
                SELECT 
                    user_id, 
                    email, 
                    is_verified 
                FROM users 
                WHERE email = $1`
            ;
            const userResult = await this.db.query(getUserQuery, [email]);

            if (userResult.rows.length === 0) {
                return{
                    success:false,
                    data:null,
                    message:"User not found"
                }
            }

            const user = userResult.rows[0];

            if (user.is_verified) {
                return {
                    success: false,
                    message: 'Email is already verified',
                    error: 'EMAIL_ALREADY_VERIFIED',
                }
            }

            // Generate new token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const redisKey = `email_verification:${verificationToken}`;

            // Store in Redis with 15-minute expiry
            await this.redis.setex(redisKey, 15 * 60, user.id.toString());

            // Send email
            await this.emailService.sendVerificationEmail(email, verificationToken);

            return { 
                success:true,
                data:null,
                message: 'Verification email sent' 
            };
        }catch(error){
            Logger.getInstance().logError("resendVerificationEmail:: Failed to resend verification email"+error)
            return {
                success:false,
                message:"Failed to resend verification email",
                error:error,
            };
        }
    }
}
