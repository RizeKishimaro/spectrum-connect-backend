import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class BasicQuery {
  @ApiProperty({
    example: 1,
    description: 'page number',
    required: false, // Mark as optional in Swagger
  })
  @IsNumberString()
  @IsOptional()
  page?: string = '1';

  @ApiProperty({
    example: 10,
    description: 'limit',
    required: false, // Mark as optional in Swagger
  })
  @IsNumberString()
  @IsOptional()
  limit?: string = '10';

  @ApiProperty({
    example: '',
    description: 'search keyword',
    required: false, // Mark as optional in Swagger
  })
  @IsString()
  @IsOptional()
  searchKeyword?: string = '';

  @ApiProperty({
    example: 'id',
    description: 'sorting field',
    required: false, // Mark as optional in Swagger
  })
  @IsString()
  @IsOptional()
  sortField?: string = 'id';

  @ApiProperty({
    example: 'desc',
    description: 'asc or desc',
    required: false, // Mark as optional in Swagger
  })
  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortType?: string = 'desc';

  @ApiProperty({
    example: '',
    description: 'filter model',
    required: false, // Mark as optional in Swagger
  })
  @IsString()
  @IsOptional()
  filterModel?: string = '';

  @ApiProperty({
    example: '',
    description: 'filter keyword',
    required: false, // Mark as optional in Swagger
  })
  @IsString()
  @IsOptional()
  filterKeyword?: string = '';
}

