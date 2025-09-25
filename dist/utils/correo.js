"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarCorreo = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.gmail.com', // o tu servidor SMTP
    port: 465,
    secure: true, // true para 465, false para 587
    auth: {
        user: 'contacto.aulaconnect@gmail.com', // tu correo
        pass: 'styw lrma bjui fswf' // contraseña de app si usas 2FA
    }
});
const enviarCorreo = (para, asunto, mensaje, attachments) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const info = yield transporter.sendMail({
            from: '"AulaConnect" <contacto.aulaconnect@gmail.com>',
            to: para,
            subject: asunto,
            html: mensaje,
            attachments
        });
        console.log('Correo enviado:', info.messageId);
    }
    catch (error) {
        console.error('Error enviando correo:', error);
    }
});
exports.enviarCorreo = enviarCorreo;
