import { 
    ArgumentMetadata, 
    BadRequestException, 
    Injectable, 
    PipeTransform 
} from '@nestjs/common';
import { Response } from 'express';
import { ZodSchema  } from 'zod';
import { Logger } from 'src/utils/utils';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
    
    constructor(private schema: ZodSchema, private readonly  res : Response) {}

    public transform(value: any, metadata: ArgumentMetadata): boolean {
        const result = this.schema.safeParse(value);
        if (!result.success) {
            const errorMessage = result.error.errors.map((err) => err.message).join(', ');
            Logger.getInstance().error(result.error.errors);
            this.res.send(400).json({errorMessage})
            return false;
        }
        return true;
    }
}


