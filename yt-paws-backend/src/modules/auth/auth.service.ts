import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// PRD US-01.1: at least 8 characters, containing both letters and numbers.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string, phone?: string) {
    if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_RULE.test(password)) {
      throw new BadRequestException(
        `密码至少需要 ${PASSWORD_MIN_LENGTH} 位,且必须同时包含字母和数字`,
      );
    }

    // 检查邮箱是否已存在
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户(角色默认为 customer,与 schema 默认值保持一致)
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, phone },
    });

    // 返回 token(载荷携带 role,供后续模块的权限校验 Guard 使用)
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async login(email: string, password: string) {
    // 查找用户
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 返回 token(载荷携带 role,供后续模块的权限校验 Guard 使用)
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }
}