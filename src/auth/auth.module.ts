import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schemas';
import { RefreshToken, RefreshTokenSchema } from './schemas/refreshToken.schema';
import { MailService } from 'src/services/mail.service';
import { ResetToken, ResetTokenSchema } from './schemas/resetToken.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: RefreshToken.name,
        schema: RefreshTokenSchema,
      },
      {
        name: ResetToken.name,
        schema: ResetTokenSchema,
      },
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService],
})

export class AuthModule {}
