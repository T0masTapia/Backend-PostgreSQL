import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const enviarCorreo = async (para: string, asunto: string, mensaje: string) => {
  try {
    const msg = {
      to: para,
      from: process.env.FROM_EMAIL!,
      subject: asunto,
      html: mensaje,
    };
    await sgMail.send(msg);
    console.log('✅ Correo enviado a:', para);
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
};
