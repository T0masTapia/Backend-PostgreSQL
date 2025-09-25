// src/routes/restablecerPassword.ts
import express from "express";
import db from "../db"; // aquí db es el pool de pg
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { enviarCorreo } from "../utils/correo";

const router = express.Router();

// 1️⃣ Solicitar restablecimiento de contraseña
router.post("/solicitar", async (req, res) => {
  const { correo } = req.body;

  if (!correo) return res.status(400).json({ success: false, error: "Falta el correo" });

  try {
    // Verificar que el usuario exista
    const resultsUser = await db.query(
      `SELECT u.id_usuario, a.nombre_completo 
       FROM usuario u 
       LEFT JOIN alumno a ON u.id_usuario = a.id_usuario 
       WHERE u.correo = $1`,
      [correo]
    );

    if (resultsUser.rows.length === 0)
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });

    const user = resultsUser.rows[0];

    // Opcional: eliminar tokens previos del usuario
    await db.query("DELETE FROM password_reset_tokens WHERE id_usuario = $1", [
      user.id_usuario,
    ]);

    // Generar token único y fecha de expiración (1 hora)
    const token = uuidv4();
    const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token
    await db.query(
      "INSERT INTO password_reset_tokens (id_usuario, token, expiracion) VALUES ($1, $2, $3)",
      [user.id_usuario, token, expiracion]
    );

    // Enlace configurable con variable de entorno
    const enlace = `${process.env.FRONTEND_URL}/restablecer-password?token=${token}`;

    // Enviar correo
    await enviarCorreo(
      correo,
      "Restablecer contraseña - AulaConnect Educa",
      `
        <p>Hola ${user.nombre_completo || "usuario"},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${enlace}">Restablecer contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `
    );

    res.json({ success: true, message: "Correo de restablecimiento enviado" });
  } catch (error) {
    console.error("Error en /solicitar:", error);
    res.status(500).json({ success: false, error: "Error del servidor" });
  }
});

// 2️⃣ Verificar token y cambiar contraseña
router.post("/cambiar", async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena)
    return res.status(400).json({ success: false, error: "Faltan datos" });

  try {
    // Buscar token válido
    const resultsToken = await db.query(
      "SELECT * FROM password_reset_tokens WHERE token = $1 AND expiracion > NOW()",
      [token]
    );

    if (resultsToken.rows.length === 0)
      return res.status(400).json({ success: false, error: "Token inválido o expirado" });

    const tokenData = resultsToken.rows[0];

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    // Actualizar contraseña del usuario
    await db.query("UPDATE usuario SET password = $1 WHERE id_usuario = $2", [
      hashedPassword,
      tokenData.id_usuario,
    ]);

    // Borrar token usado
    await db.query("DELETE FROM password_reset_tokens WHERE id_usuario = $1", [
      tokenData.id_usuario,
    ]);

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error en /cambiar:", error);
    res.status(500).json({ success: false, error: "Error del servidor" });
  }
});

export default router;
