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
// src/cron/recordatorioDeudas.ts
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = __importDefault(require("../db"));
const correo_1 = require("../utils/correo");
// Ejecutar todos los días a las 10:50 AM
node_cron_1.default.schedule("50 10 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🔔 Ejecutando recordatorio de deudas...");
    try {
        // Buscar deudas que vencen en 2 días (PostgreSQL usa INTERVAL)
        const query = `
      SELECT d.id_deuda, d.monto, d.fecha_limite, 
             a.nombre_completo, u.correo, c.nombre_curso
      FROM deuda d
      JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
      JOIN alumno a ON ac.rut_alumno = a.rut
      JOIN usuario u ON a.id_usuario = u.id_usuario
      JOIN curso c ON ac.id_curso = c.id_curso
      WHERE d.estado = 'pendiente'
        AND DATE(d.fecha_limite) = DATE(NOW() + INTERVAL '2 days')
    `;
        const { rows: deudas } = yield db_1.default.query(query);
        for (const deuda of deudas) {
            const fechaVenc = new Date(deuda.fecha_limite).toLocaleDateString("es-CL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            // Enviar correo recordatorio
            yield (0, correo_1.enviarCorreo)(deuda.correo, `🔔 Recordatorio de Pago - Curso ${deuda.nombre_curso}`, `
  <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      
      <div style="background:#c0392b; color:#ffffff; padding:15px; text-align:center;">
        <h2 style="margin:0;">⚠️ Recordatorio de Pago</h2>
      </div>

      <div style="padding:20px; color:#333;">
        <p>Estimado/a <strong>${deuda.nombre_completo}</strong>,</p>
        <p>
          Le recordamos que tiene un <strong>pago pendiente</strong> correspondiente al curso:<br>
          <span style="font-size:16px; color:#2980b9;"><strong>${deuda.nombre_curso}</strong></span>
        </p>

        <table style="width:100%; margin:20px 0; border-collapse:collapse;">
          <tr>
            <td style="padding:8px; border:1px solid #ddd;"><strong>Monto pendiente</strong></td>
            <td style="padding:8px; border:1px solid #ddd; color:#c0392b;">$${Number(deuda.monto).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;"><strong>Fecha límite</strong></td>
            <td style="padding:8px; border:1px solid #ddd;">${fechaVenc}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;"><strong>Tiempo restante</strong></td>
            <td style="padding:8px; border:1px solid #ddd; color:#e67e22;">2 días</td>
          </tr>
        </table>

        <p style="margin-top:20px;">
          Para evitar inconvenientes, le recomendamos realizar el pago antes de la fecha indicada.
        </p>

        <div style="text-align:center; margin:30px 0;">
          <a href="https://aulaconnect.com/pagos" 
             style="background:#27ae60; color:#fff; padding:12px 20px; text-decoration:none; border-radius:5px; font-weight:bold; display:inline-block;">
            💳 Realizar Pago Ahora
          </a>
        </div>

        <p style="font-size:14px; color:#777;">
          Si ya realizó el pago, por favor ignore este mensaje.
        </p>
      </div>

      <div style="background:#f0f0f0; padding:15px; text-align:center; font-size:12px; color:#555;">
        AulaConnect Educa © 2025<br>
        Este es un recordatorio automático, no responda a este correo.
      </div>

    </div>
  </div>
  `);
            console.log(`📧 Recordatorio enviado a ${deuda.correo}`);
        }
    }
    catch (err) {
        console.error("❌ Error en recordatorio de deudas:", err);
    }
}));
