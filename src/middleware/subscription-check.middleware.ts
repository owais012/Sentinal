import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from 'src/database/database.service';
import { Logger } from 'src/utils/utils';
// Extend Request interface to include company
declare global {
  namespace Express {
    interface Request {
      company_name?: string;
      company_id?: number;
    }
  }
}

@Injectable()
export class SubscriptionCheckMiddleware implements NestMiddleware {
  constructor(private readonly db: DatabaseService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Skip if no company identifier in request

        const company_id = req.headers['company-id'] || req.query.company_id;
        const company_name = req.headers['company-name'] || req.query.company_name;

        // Fetch company from database
        const companyQuery = `
                    SELECT company_id, schema_name, company_name, subscription_status, 
                        subscription_expires_at, subscription_plan, is_active, updated_at
                    FROM public.companies 
                    WHERE company_id = $1
                `;

        const result = await this.db.query(companyQuery, [company_id]);

        if (result.rows.length === 0) {
            return next();
        }

        const company = result.rows[0];

        // Check if subscription has expired
        const now = new Date();
        const expiresAt = new Date(company.subscription_expires_at);
        const isExpired = company.subscription_expires_at && expiresAt <= now;

        if (isExpired && company.subscription_status === 'active') {
            // Update subscription status to inactive
            const updateQuery = `
                    UPDATE public.companies 
                    SET subscription_status = $1, updated_at = $2
                    WHERE company_id = $3
                    `;

            await this.db.query(updateQuery, ['inactive', now, company_id]);

            // Update the company object
            company.subscription_status = 'inactive';
            company.updated_at = now;

            Logger.getInstance().log(
            `Subscription for company ${company.company_name} has expired and was set to inactive.`,
            );
        }

        // Set company data in request for use in controllers
        //commented this , as there was some error of number & string , to be fixed later
        // req.company_id = company_id;
        // req.company_name = company_name;
    } catch (error) {
        Logger.getInstance().error('Error in subscription check middleware:' + error);
        // Don't block the request if middleware fails
    }

    next();
  }
}
