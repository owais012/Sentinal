import { Injectable } from "@nestjs/common";
import { ServiceResult } from "src/types/types";
import { Logger } from "src/utils/utils";
import { DatabaseService } from "src/database/database.service";

export interface ICompany {
    company_id: number;
    schema_name: string;
    company_name: string;
    legal_name: string;
    user_id:number; // owner of the company
    gstin: string;
    industry: string;
    website ?: string;
    logo_url ?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    timezone: string;
    currency: string;
    date_format: string;
    subscription_plan : string;
    subscription_status: string;
    subscription_expires_at: Date;
    max_users ?: number;
    // services
    email_notifications ?: boolean;
    sms_notifications ?: boolean;
    invoice_reminders ?: boolean;
    payment_alerts ?: boolean;
    report_updates ?: boolean;

    is_active : boolean;
    schema_created: boolean;
    created_at: Date;
    updated_at: Date;
}

@Injectable()
export class CompanyService{
    constructor(private readonly db: DatabaseService) {}
    public async createCompany(companyData: ICompany):Promise<ServiceResult<ICompany>>{
        try {
            const sql = `
                Insert into public.companies(
                    user_id,
                    schema_name,
                    company_name,
                    legal_name,
                    gstin,
                    industry,
                    website,
                    logo_url,
                    address,
                    city,
                    state,
                    country,
                    postal_code,
                    timezone,
                    currency,
                    date_format,
                    subscription_plan,
                    subscription_status,
                    subscription_expires_at,
                    max_users,
                    is_active,
                    schema_created,
                    created_at,
                    updated_at
                )Values(
                    ${companyData.user_id},
                    ${companyData.schema_name},
                    ${companyData.company_name},
                    ${companyData.legal_name},
                    ${companyData.gstin},
                    ${companyData.industry},
                    ${companyData.website},
                    ${companyData.logo_url},
                    ${companyData.address},
                    ${companyData.city},
                    ${companyData.state},
                    ${companyData.country},
                    ${companyData.postal_code},
                    ${companyData.timezone},
                    ${companyData.currency},
                    ${companyData.date_format},
                    ${companyData.subscription_plan},
                    ${companyData.subscription_status},
                    ${companyData.subscription_expires_at},
                    ${companyData.max_users},
                    ${companyData.is_active},
                    ${companyData.schema_created},
                    ${companyData.created_at},
                    ${companyData.updated_at}
                )
                Returning *
            `;

            const result = await this.db.query(sql);

            /**
             * To check what plan user has subscribed to
             * 1. trial,
             * 2.monthly
             * 3. quarterly
             * 4. yearly
             * 
             * based upon that we create the schema for the company
             * this schema creation is either to be done through database service or as an event api
             * need handle money transactions for subscription
             */


            return{
                success: true,
                data: result.rows[0] as ICompany,
                message: "Company created successfully"
            }

        } catch (error) {
            Logger.getInstance().error("createCompany :: Failed to create company: " + error);
            return {
                success: false,
                error:  error || 'COMPANY_CREATION_FAILED',
                message: "Failed to create company"
            }
        }
    }

    public async updateCompany(companyData: ICompany):Promise<ServiceResult<ICompany>>{
        try {
            let sql = `
                Update public.companies
                SET
            `;

            if(companyData.address)
                sql += `address = ${companyData.address}, `;
            
            if(companyData.city)
                sql += `city = ${companyData.city}, `;
            
            if(companyData.state)
                sql += `state = ${companyData.state}, `;

            if(companyData.country)
                sql += `country = ${companyData.country}, `;

            if(companyData.postal_code)
                sql += `postal_code = ${companyData.postal_code}, `;

            if(companyData.timezone)
                sql += `timezone = ${companyData.timezone}, `;

            if(companyData.currency)
                sql += `currency = ${companyData.currency}, `;

            if(companyData.date_format)
                sql += `date_format = ${companyData.date_format}, `;

            //sql = sql.slice(0, -2); // Remove trailing comma and space
            sql += ` WHERE id = ${companyData.company_id}
                Returning *
            `;

            const result = await this.db.query(sql);

            return {
                success: true,
                data: result.rows[0] as ICompany,
                message: "Company updated successfully"
            }

        } catch (error) {
            Logger.getInstance().error("updateCompany :: Failed to update company: " + error);
            return {    
                success: false,
                error:  error || 'COMPANY_UPDATE_FAILED',
                message: "Failed to update company"
            }
        }
    }

    public async updateCompanySubscription():Promise<ServiceResult<ICompany>>{
        try {
            // Logic to update the company subscription

            return {
                success: true,
                data: {} as ICompany, // Return the updated company data
                message: "Company subscription updated successfully"
            };
        } catch (error) {
            Logger.getInstance().error("updateCompanySubscription :: Failed to update company subscription: " + error);
            return {
                success: false,
                error:  error || 'COMPANY_SUBSCRIPTION_UPDATE_FAILED',
                message: "Failed to update company subscription"
            }
        }
    }

    public async updateNotificationSettings(
        company_id: number,
        user_id: number,
        email_notifications ?: boolean,
        sms_notifications ?: boolean,
        invoice_reminders ?: boolean,
        payment_alerts ?: boolean,
        report_updates ?: boolean
    ):Promise<ServiceResult<ICompany>>{
        try {
            // Logic to update the notification settings
            let sql = `
                UPDATE public.companies
                SET
            `;

            if(email_notifications !== undefined)
                sql += `email_notifications = ${email_notifications}, `;
            if(sms_notifications !== undefined)
                sql += `sms_notifications = ${sms_notifications}, `;
            if(invoice_reminders !== undefined)
                sql += `invoice_reminders = ${invoice_reminders}, `;
            if(payment_alerts !== undefined)
                sql += `payment_alerts = ${payment_alerts}, `;
            if(report_updates !== undefined)
                sql += `report_updates = ${report_updates}, `;

            sql = sql.slice(0, -2); // Remove trailing comma and space
            sql += ` WHERE company_id = ${company_id}
                AND user_id = ${user_id}
                Returning
            `;
            if(email_notifications !== undefined) sql += `email_notifications, `;
            if(sms_notifications !== undefined) sql += `sms_notifications, `;
            if(invoice_reminders !== undefined) sql += `invoice_reminders, `;
            if(payment_alerts !== undefined) sql += `payment_alerts, `;
            if(report_updates !== undefined) sql += `report_updates, `;

            const result = await this.db.query(sql);

            return {
                success: true,
                data: result.rows[0] as ICompany,
                message: "Notification settings updated successfully"
            };
            
        } catch (error) {
            Logger.getInstance().error("updateNotificationSettings :: Failed to update notification settings: " + error);
            return {
                success: false,
                error:  error || 'NOTIFICATION_SETTINGS_UPDATE_FAILED',
                message: "Failed to update notification settings"
            }
        }
    }


    public async getCompany(company_id : number):Promise<ServiceResult<ICompany>>{
        try {
            const sql = `
                SELECT 
                    user_id,
                    company_id,
                    schema_name,
                    company_name,
                    legal_name,
                    gstin,
                    industry,
                    website,
                    logo_url,
                    address,
                    city,
                    state,
                    country,
                    postal_code,
                    timezone,
                    currency,
                    date_format,
                    subscription_plan,
                    subscription_status,
                    subscription_expires_at,
                    max_users,
                    is_active,
                    schema_created,
                    created_at,
                    updated_at
                FROM public.companies
                WHERE company_id = ${company_id}
            `;

            const result = await this.db.query(sql);

            return {
                success:true,
                data: result.rows[0] as ICompany,
                message: "Company retrieved successfully"
            }
        } catch (error) {
            Logger.getInstance().error("getCompany :: Failed to get company: " + error);
            return {
                success: false,
                error:  error || 'COMPANY_RETRIEVAL_FAILED',
                message: "Failed to get company"
            }
        }
    }

    public async deleteCompany(company_id: number, user_id: number): Promise<ServiceResult<Boolean>> {
        try {
            const sql = `
                DELETE FROM public.companies
                WHERE company_id = ${company_id}
                AND user_id = ${user_id}
            `;

            await this.db.query(sql);

            return {
                success: true,
                data: true
            };
        } catch (error) {
            Logger.getInstance().error("deleteCompany :: Failed to delete company: " + error);
            return {
                success: false,
                error:  error || 'COMPANY_DELETION_FAILED',
                message: "Failed to delete company"
            }
        }
    }
}