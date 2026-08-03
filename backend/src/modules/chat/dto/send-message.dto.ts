import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty.' })
  @MaxLength(4000, { message: 'Message content exceeds maximum length of 4000 characters.' })
  message!: string;
}
