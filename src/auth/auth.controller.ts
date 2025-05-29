
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PublicRoute } from 'src/utils/decorators/public.decorator';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('CallLogs')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @PublicRoute()
  @ApiOperation({ summary: 'Create a User' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User created successfully~ ✨', type: Object })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @PublicRoute()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

