import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto } from 'src/auth/dto/login.dto';
import { PublicRoute } from 'src/utils/decorators/public.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @PublicRoute()
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.userService.login(body);
  }
}
