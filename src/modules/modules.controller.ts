import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { ModulesService } from "./modules.service";
import { Prisma } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard/roles.guard";
import { Roles } from "../auth/roles.decorator/roles.decorator";
import { UserRole } from "@prisma/client";

@Controller("modules")
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createModuleDto: Prisma.ModuleCreateInput) {
    return this.modulesService.create(createModuleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get()
  findAll() {
    return this.modulesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.modulesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateModuleDto: Prisma.ModuleUpdateInput) {
    return this.modulesService.update(id, updateModuleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.modulesService.remove(id);
  }
}


