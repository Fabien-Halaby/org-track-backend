import { IsString, IsArray } from 'class-validator';

export class CreateProjectAccessDto {
  @IsString()
  userId: string;

  @IsString()
  projectId: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsString()
  grantedById: string;
}
