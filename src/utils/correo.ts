import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const enviarCorreo = async (
  para: string,
  asunto: string,
  mensaje: string,
  adjuntos?: { filename: string; content: Buffer; contentType: string }[]
) => {
  try {
    const msg = {
      to: para,
      from: process.env.FROM_EMAIL!,
      subject: asunto,
      html: mensaje,
      attachments: adjuntos?.map(file => ({
        content: file.content.toString('base64'),
        filename: file.filename,
        type: file.contentType,
        disposition: 'attachment',
      })),
    };

    await sgMail.send(msg);
    console.log('✅ Correo enviado a:', para);
  } catch (error: any) {
    console.error('Error enviando correo:', error.response?.body || error);
  }
};
