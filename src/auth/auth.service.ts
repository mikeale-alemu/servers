import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schemas';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './schemas/refreshToken.schema';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { ResetToken } from './schemas/resetToken.schemas';
import { nanoid } from 'nanoid';
import { MailService } from 'src/services/mail.service';

@Injectable()
export class AuthService {
  
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(RefreshToken.name) private RefreshTokenModel: Model<RefreshToken>,
    @InjectModel(ResetToken.name) private ResetTokenModel: Model<ResetToken>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async create(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    const emailInUse = await this.userModel.findOne({
      email,
    });

    if (emailInUse) {
      throw new BadRequestException("Email already is userd!")
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user document and save in mongodb
    await this.userModel.create({
      name,
      email,
      password: hashedPassword
    })
  }

  async login(credentials: LoginDto) {
    const { email, password } = credentials;
    // Find if user exists by email
    const user = await this.userModel.findOne({ email })
    if (!user) {
      throw new UnauthorizedException("Invalid email or password!")
    }

    // Compare entered password with existing password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException("Invalid email or password!")
    }

    // Generate JWT tokens
    const tokens = await this.generateUserTokens(user._id);
    return {
      ...tokens,
      userId: user._id,
    }; 
  }

  async refreshTokens(refreshToken: string) {
    const token = await this.RefreshTokenModel.findOne({
      token: refreshToken,
      expiryDate: { $gte: new Date() },
    });

    if (!token) {
      throw new UnauthorizedException("Invalid refresh token!")
    }

    return this.generateUserTokens(token.userId);
  }

  async generateUserTokens(userId) {
    const accessToken = await this.jwtService.sign({ userId }, { expiresIn: '10h' });
    const refreshToken = uuidv4();

    await this.storeRefreshToken(refreshToken, userId);
    return { 
      accessToken,
      refreshToken,
    }
  }

  async storeRefreshToken(token: string, userId) {
    // Calculate expiry date 3 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    await this.RefreshTokenModel.updateOne(
      { userId },
      { $set: { expiryDate, token } },
      { upsert: true, },
    );
  }



  async findAll() {
    const books = await this.userModel.find();
    return books;
  }

  async changePassword(userId, oldPassword: string, newPassword: string) {
    // Find the user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Compare the old password with the password in DB
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException("Old password is incorrect");
    }


    // Change user's password (DON'T FORGET TO HASH IT!)
    const newHashPassword = await bcrypt.hash(newPassword, 10);
    user.password = newHashPassword;
    await user.save();

  }

  async forgotPassword(email: string) {
    // Check that user exists
    const user = await this.userModel.findOne({ email });

    if (user) {
    // If user exists, generate password reset link
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);

    const resetToken = nanoid(64);
    await this.ResetTokenModel.create({
      token: resetToken,
      userId: user._id,
      expiryDate,
    });


    // Send the linkto the user by email (using nodemailer/ SES / etc...)
    this.mailService.sendPasswordRestEmail(email, resetToken)
    }

    return { message: 'If this user exists, they will receive as email' };
  } 

  async resetPassword(newPassword: string, resetToken: string) {
    // Find a valid reset token document
    const token = await this.ResetTokenModel.findOne({
      token: resetToken,
      expiryDate: { $gte: new Date() },
    });

    if (!token) {
      throw new UnauthorizedException("Invalid token or expired token");
    }

    // Change user password (MAKE SURE TO HASH!!)
    const user = await this.userModel.findById(token.userId);
    if (!user) {
      throw new InternalServerErrorException();
    }
  
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }



  // async findOne(id: number) {
  //   return `This action returns a #${id} auth`;
  // }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  // async remove(id: number) {
  //   return `This action removes a #${id} auth`;
  // }
}
