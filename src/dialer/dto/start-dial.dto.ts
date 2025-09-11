import { IsInt, IsOptional, Min } from 'class-validator';


export class StartDialDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  slots?: number; // how many parallel customer dials for this agent
}
