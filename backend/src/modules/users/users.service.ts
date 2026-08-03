import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.userRepository.findOne({ where: { email: normalizedEmail } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email address is already in use.');
    }

    const user = this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
    });

    return this.userRepository.save(user);
  }
}
