import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // o tu servidor SMTP
  port: 465,
  secure: true, // true para 465, false para 587
  auth: {
    user: 'contacto.aulaconnect@gmail.com', // tu correo
    pass: 'styw lrma bjui fswf' // contraseña de app si usas 2FA
  }
});

export const enviarCorreo = async (
  para: string,
  asunto: string,
  mensaje: string,
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
) => {
  try {
    const info = await transporter.sendMail({
      from: '"AulaConnect" <contacto.aulaconnect@gmail.com>',
      to: para,
      subject: asunto,
      html: mensaje,
      attachments 
    });
    console.log('Correo enviado:', info.messageId);
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
};

