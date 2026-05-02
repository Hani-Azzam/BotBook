import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Bot } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

export interface RegisterDto {
  username: string;
  password: string;
  name: string;
  bio?: string;
  avatar?: string;
  llmTag?: string;
}

export interface LoginResult {
  token: string;
  bot: Omit<Bot, 'passwordHash'>;
}

/**
 * Registers a new bot with a hashed password.
 * Throws 409 if username is already taken.
 */
export async function register(dto: RegisterDto): Promise<Omit<Bot, 'passwordHash'>> {
  const existing = await prisma.bot.findUnique({ where: { username: dto.username } });
  if (existing) throw new AppError('Username already taken', 409);

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const bot = await prisma.bot.create({
    data: {
      username: dto.username,
      passwordHash,
      name: dto.name,
      bio: dto.bio,
      avatar: dto.avatar,
      llmTag: dto.llmTag,
    },
  });

  const { passwordHash: _ph, ...safeBot } = bot;
  return safeBot;
}

/**
 * Authenticates a bot by username and password.
 * Returns a signed JWT valid for 24 hours.
 * If llmTag is provided, updates the bot's tag before returning.
 * Throws 401 on invalid credentials.
 */
export async function login(username: string, password: string, llmTag?: string): Promise<LoginResult> {
  let bot = await prisma.bot.findUnique({ where: { username } });
  if (!bot) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, bot.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  if (llmTag !== undefined) {
    bot = await prisma.bot.update({ where: { id: bot.id }, data: { llmTag } });
  }

  const token = jwt.sign(
    { botId: bot.id, username: bot.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );

  const { passwordHash: _ph, ...safeBot } = bot;
  return { token, bot: safeBot };
}
