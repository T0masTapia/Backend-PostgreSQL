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
// src/routes/restablecerPassword.ts
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db")); // aquí db es el pool de pg
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const correo_1 = require("../utils/correo");
const router = express_1.default.Router();
// 1️⃣ Solicitar restablecimiento de contraseña
router.post("/solicitar", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { correo } = req.body;
    if (!correo)
        return res.status(400).json({ success: false, error: "Falta el correo" });
    try {
        // Verificar que el usuario exista
        const resultsUser = yield db_1.default.query(`SELECT u.id_usuario, a.nombre_completo 
       FROM usuario u 
       LEFT JOIN alumno a ON u.id_usuario = a.id_usuario 
       WHERE u.correo = $1`, [correo]);
        if (resultsUser.rows.length === 0)
            return res.status(404).json({ success: false, error: "Usuario no encontrado" });
        const user = resultsUser.rows[0];
        // Opcional: eliminar tokens previos del usuario
        yield db_1.default.query("DELETE FROM password_reset_tokens WHERE id_usuario = $1", [
            user.id_usuario,
        ]);
        // Generar token único y fecha de expiración (1 hora)
        const token = (0, uuid_1.v4)();
        const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        // Guardar token
        yield db_1.default.query("INSERT INTO password_reset_tokens (id_usuario, token, expiracion) VALUES ($1, $2, $3)", [user.id_usuario, token, expiracion]);
        // Enlace configurable con variable de entorno
        const enlace = `${process.env.FRONTEND_URL}/restablecer-password?token=${token}`;
        // Enviar correo
        yield (0, correo_1.enviarCorreo)(correo, "Restablecer contraseña - AulaConnect Educa", `
        <p>Hola ${user.nombre_completo || "usuario"},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${enlace}">Restablecer contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `);
        res.json({ success: true, message: "Correo de restablecimiento enviado" });
    }
    catch (error) {
        console.error("Error en /solicitar:", error);
        res.status(500).json({ success: false, error: "Error del servidor" });
    }
}));
// 2️⃣ Verificar token y cambiar contraseña
router.post("/cambiar", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, nuevaContrasena } = req.body;
    if (!token || !nuevaContrasena)
        return res.status(400).json({ success: false, error: "Faltan datos" });
    try {
        // Buscar token válido
        const resultsToken = yield db_1.default.query("SELECT * FROM password_reset_tokens WHERE token = $1 AND expiracion > NOW()", [token]);
        if (resultsToken.rows.length === 0)
            return res.status(400).json({ success: false, error: "Token inválido o expirado" });
        const tokenData = resultsToken.rows[0];
        // Hashear nueva contraseña
        const hashedPassword = yield bcrypt_1.default.hash(nuevaContrasena, 10);
        // Actualizar contraseña del usuario
        yield db_1.default.query("UPDATE usuario SET password = $1 WHERE id_usuario = $2", [
            hashedPassword,
            tokenData.id_usuario,
        ]);
        // Borrar token usado
        yield db_1.default.query("DELETE FROM password_reset_tokens WHERE id_usuario = $1", [
            tokenData.id_usuario,
        ]);
        res.json({ success: true, message: "Contraseña actualizada correctamente" });
    }
    catch (error) {
        console.error("Error en /cambiar:", error);
        res.status(500).json({ success: false, error: "Error del servidor" });
    }
}));
exports.default = router;
