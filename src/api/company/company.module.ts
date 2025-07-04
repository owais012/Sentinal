import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";

import { CompanyController } from "./company.controller";
import { CompanyService } from "./company.service";

@Module({
    imports: [DatabaseModule],
    controllers: [CompanyController],
    providers: [CompanyService],
})

export class CompanyModule {}   
