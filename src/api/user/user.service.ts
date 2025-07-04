import { QueryResult } from 'pg';
import { DatabaseService } from 'src/database/database.service';
import { ServiceResult } from '../../types/types';
import { Logger } from 'src/utils/utils';
import { Injectable } from '@nestjs/common';
import {ICompany} from '../company/company.service';

export interface User {
  identifier?: string;
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  is_verified: boolean;
  is_deleted: boolean;
}

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  public async GetUserById(user_id: number): Promise<ServiceResult<User>> {
    try {
      const sql = `
        SELECT 
          identifier,
          user_id,
          full_name,
          email,
          phone_number,
          created_at,
          updated_at,
          is_active,
          is_verified,
          is_deleted
        FROM public."user" 
        WHERE user_id = $1
        AND is_deleted = false`;

      const result: QueryResult<User> = await this.db.query(sql, [user_id]);
      
      if (result.rowCount === 0) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: result.rows[0] as User,
        message: 'User retrieved successfully'
      };

    } catch (error) {
      Logger.getInstance().error("GetUserById :: Failed to fetch user: " + error);
      return {
        success: false,
        error: error.message || 'Database error occurred',
        message: 'Failed to fetch user'
      };
    }
  }

  public async createUser(userData: User): Promise<ServiceResult<User>> {
    try {
      const sql = `
        INSERT INTO public."user" (
          full_name, 
          , 
          email, 
          phone_number, 
          created_at, 
          updated_at, 
          is_active, 
          is_verified, 
          is_deleted
        ) VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7)
        RETURNING *`;
        
      const params = [
        userData.full_name,
        userData.email,
        userData.phone_number,
        true,  // is_active
        false, // is_verified
        false // is_deleted
      ];

      const result: QueryResult<User> = await this.db.query(sql, params);
      
      return {
        success: true,
        data: result.rows[0] as User,
        message: 'User created successfully'
      };

    } catch (error) {
      Logger.getInstance().error("createUser:: Failed to create user: " + error);
      
      // Handle specific database errors
      if (error.code === '23505') { // PostgreSQL unique violation
        return {
          success: false,
          error: 'Email or phone number already exists',
          message: 'User with this email or phone already exists'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Database error occurred',
        message: 'Failed to create user'
      };
    }
  }

  public async getAllUsers(page: number = 1, limit: number = 10): Promise<ServiceResult<User[]>> {
    try {
      const offset = (page - 1) * limit;
      
      const countSql = `
        SELECT COUNT(*) as total 
        FROM public."user" 
        WHERE is_deleted = false`;
      
      const dataSql = `
        SELECT 
          identifier,
          user_id,
          full_name,
          email,
          phone_number,
          created_at,
          updated_at,
          is_active,
          is_verified,
          is_deleted
        FROM public."user" 
        WHERE is_deleted = false
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`;

      const [countResult, dataResult] = await Promise.all([
        this.db.query(countSql),
        this.db.query(dataSql, [limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total);
      
      return {
        success: true,
        data: dataResult.rows as User[],
        message: 'Users retrieved successfully',
      };

    } catch (error) {
      Logger.getInstance().error("getAllUsers :: Error fetching users: " + error);
      return {
        success: false,
        error: error.message || 'Database error occurred',
        message: 'Failed to fetch users'
      };
    }
  }

  public async getUserCompanies(userId: number): Promise<ServiceResult<ICompany[]>> {
    try {
      const sql = `
        SELECT 
          c.*
        FROM public.companies c  
        WHERE c.user_id = $1
      `;

      const result = await this.db.query(sql, [userId]);

      return {
        success: true,
        data: result.rows as ICompany[],
        message: 'User companies retrieved successfully'
      }
    } catch (error) {
      Logger.getInstance().error("getUserCompanies :: Error fetching user companies: " + error);
      return {
        success: false,
        error: error.message || 'Database error occurred',
        message: 'Failed to fetch user companies'
      };
    }
  }
}