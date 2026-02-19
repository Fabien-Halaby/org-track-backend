import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyInvitationDto {
  @ApiProperty()
  @IsString()
  token: string;
}