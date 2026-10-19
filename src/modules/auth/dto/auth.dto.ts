import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'hoc.vien@example.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ minLength: 8, example: 'matkhau123' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Tên hiển thị tối thiểu 2 ký tự' })
  @MaxLength(50)
  displayName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'hoc.vien@example.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}
