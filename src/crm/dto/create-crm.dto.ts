import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsPhoneNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCrmDto {
  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'Contact email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number in international format',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'Tech Solutions Inc.',
    description: 'Name of the company',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    example: '10-50',
    description: 'Number of employees',
  })
  @IsString()
  employeeCount: string;

  @ApiProperty({
    example: '5',
    description: 'Number of locations or company branches',
  })
  @IsString()
  companyCount: string;

  @ApiProperty({
    example: ['VoIP Setup', 'Cloud PBX'],
    description: 'Services the contact is interested in',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiProperty({
    example: 'They are interested in a demo next week.',
    required: false,
    description: 'Additional notes or description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '123 Main St, New York, NY',
    required: false,
    description: 'Company or contact address',
  })
  @IsOptional()
  @IsString()
  address?: string;

    @ApiProperty({
    example: false,
    required: false,
    default: false,
    description: 'Flag indicating whether the contact was successfully made',
  })
  @IsOptional()
  @IsBoolean()
  isContacted?: boolean;
}
