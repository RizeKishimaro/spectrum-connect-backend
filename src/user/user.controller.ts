import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
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
  @Get()
  getAllUsers() {
    return this.userService.getAllUsers()
  }

  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.userService.getUser(id)
  }

  @Patch(":id")
  updateUser(@Param("id") id: string, @Body() body: any) {
    return this.userService.updateUser(id, body)
  }

  @Delete(":id")
  removeUser(@Param("id") id: string) {
    return this.userService.removeUser(id)
  }
}
