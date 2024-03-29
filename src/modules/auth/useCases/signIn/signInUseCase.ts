import crypto from "crypto-js";
import { SignInDTO } from "../../types/signIn";
import { AppError } from "../../../../errors/appError";
import { prisma } from "../../../../config/prismaClient";
import joi from "joi";
import * as jwt from "jsonwebtoken";
require("dotenv").config();


export class SignInUseCase {
  async execute({ email, password }: SignInDTO) {
    const validation = joi.object({
      email: joi.string().trim(true).email().required(),
      password: joi.string().min(8).trim(true).required()
    })

    if('error' in validation.validate({ email, password })){
      throw new AppError("Invalid data", 400);
    }

    try {
      const hashPassword = crypto.HmacSHA1(password, process.env.SECRET).toString()

      const user = await prisma.user.findFirstOrThrow({ where: { password: hashPassword, email: email }})

      const accessToken = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: 1 });
      const refreshToken = crypto.HmacSHA1(accessToken, process.env.SECRET).toString()
      let expiresAt = new Date()
      expiresAt.setDate(new Date().getDate() + 7)

      await prisma.user.update({ where: { id: user.id }, data: { refreshToken, expiresAt }})

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        auth: true,
        accessToken: accessToken,
        refreshToken: refreshToken
      }
    } 
    catch (error) {
      throw new AppError("User not found", 400);
    }
  } 
}

