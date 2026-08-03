import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw BadRequestException if passwords do not match', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123',
        passwordConfirm: 'Mismatch123',
      };

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto = {
        email: 'test@example.com',
        password: 'Password123',
        passwordConfirm: 'Password123',
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash password and create user on valid registration', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const now = new Date();
      usersService.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: now,
        updatedAt: now,
      });

      const dto = {
        email: 'test@example.com',
        password: 'Password123',
        passwordConfirm: 'Password123',
      };

      const result = await service.register(dto);

      expect(usersService.createUser).toHaveBeenCalledWith('test@example.com', expect.any(String));
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'new-user-id', email: 'test@example.com' });
      expect(result).toEqual({
        user: {
          id: 'new-user-id',
          email: 'test@example.com',
          createdAt: now,
        },
        accessToken: 'mock-jwt-token',
      });
    });
  });
});
