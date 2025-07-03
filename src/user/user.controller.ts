import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto } from 'src/auth/dto/login.dto';
import { PublicRoute } from 'src/utils/decorators/public.decorator';
import { BasicQuery } from 'src/utils/dto/query.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @PublicRoute()
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.userService.login(body);
  }
  @Get()
  getAllUsers(@Query() basicQuery: BasicQuery) {
    return this.userService.getAllUsers(basicQuery)
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
