import {z} from "zod";

 export const CompanySchema = z.object({
    company_name : z.string().min(1, "company name is required"),
    legal_name : z.string().min(1, "legal name is required"),
    registration_number : z.string().min(1, "registration number is required"),
    tax_id : z.string().min(1, "tax id is required"),

    industry : z.string().min(1, "industry is required"),
    website : z.string().url("Invalid URL format").optional(),
    logo_url : z.string().url("Invalid URL format").optional(),
    address : z.string().min(1, "address is required"),
    city : z.string().min(1, "city is required"),
    state : z.string().min(1, "state is required"),
    country : z.string().min(1, "country is required"),
    postal_code : z.string().min(1, "postal code is required"),
})