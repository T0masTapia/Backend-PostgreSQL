import express from "express";
import db from "../db";
import { enviarCorreo } from "../utils/correo";
import crypto from "crypto";

const router = express.Router();

// POST /alumnoCurso/matricular
router.post("/matricular", async (req, res) => {
  console.log("📌 POST /alumnoCurso/matricular recibido con body:", req.body);
  try {
    const { rut_alumno, id_curso } = req.body;
    if (!rut_alumno || !id_curso)
      return res.status(400).json({ success: false, error: "Faltan datos" });

    const fecha = new Date();

    // 1️⃣ Verificar si el alumno ya tiene alguna inscripción previa
    const resultsCheck = await db.query(
      "SELECT COUNT(*) as count FROM alumno_curso WHERE rut_alumno = $1",
      [rut_alumno]
    );
    const yaTieneMatricula = parseInt(resultsCheck.rows[0].count) > 0;

    // 2️⃣ Insertar inscripción
    const resultInsert = await db.query(
      `INSERT INTO alumno_curso (rut_alumno, id_curso, fecha_inscripcion, estado)
       VALUES ($1, $2, $3, 'activo') RETURNING id`,
      [rut_alumno, id_curso, fecha]
    );
    const id_alumno_curso = resultInsert.rows[0].id;

    // 3️⃣ Obtener información del curso
    const resultsCurso = await db.query(
      "SELECT nombre_curso, costo_curso, duracion_curso FROM curso WHERE id_curso = $1",
      [id_curso]
    );
    if (resultsCurso.rows.length === 0)
      return res
        .status(400)
        .json({ success: false, error: "Curso no encontrado" });

    const cursoInfo = resultsCurso.rows[0];
    const costoCurso = Number(cursoInfo.costo_curso);
    const nombreCurso = cursoInfo.nombre_curso;
    const duracionCurso = cursoInfo.duracion_curso;

    // 3.1️⃣ Obtener costo de matrícula
    const resultsMat = await db.query("SELECT monto FROM matricula LIMIT 1");
    const costoMatricula = Number(resultsMat.rows[0].monto);

    // 4️⃣ Calcular monto de deuda
    const montoMatriculaAPagar = yaTieneMatricula ? 0 : costoMatricula;
    const montoCursos = costoCurso;
    const montoTotal = montoMatriculaAPagar + montoCursos;

    const descripcion = yaTieneMatricula
      ? `Pago pendiente por el curso: ${nombreCurso}`
      : `Pago pendiente de matrícula y curso: ${nombreCurso}`;
    const estado = "pendiente";
    const fechaDeuda = new Date();

    // Fecha límite 8 días después
    const fechaLimite = new Date(fechaDeuda);
    fechaLimite.setDate(fechaLimite.getDate() + 8);
    fechaLimite.setHours(0, 0, 0, 0);

    // Formatear fecha límite para el correo
    const fechaLimiteFormateada = fechaLimite.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // 5️⃣ Insertar deuda
    const resultDeuda = await db.query(
      `INSERT INTO deuda 
       (id_alumno_curso, monto, costo_matricula, costo_cursos, descripcion, fecha_deuda, fecha_limite, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_deuda`,
      [
        id_alumno_curso,
        montoTotal,
        montoMatriculaAPagar,
        montoCursos,
        descripcion,
        fechaDeuda,
        fechaLimite,
        estado,
      ]
    );
    const id_deuda = resultDeuda.rows[0].id_deuda;

    // 6️⃣ Obtener email y usuario
    const resultsEmail = await db.query(
      `SELECT u.correo, a.nombre_completo, u.id_usuario
       FROM alumno a
       JOIN usuario u ON a.id_usuario = u.id_usuario
       WHERE a.rut = $1`,
      [rut_alumno]
    );

    if (resultsEmail.rows.length > 0) {
      const alumnoCorreo = resultsEmail.rows[0].correo;
      const alumnoNombre = resultsEmail.rows[0].nombre_completo;
      const idUsuario = resultsEmail.rows[0].id_usuario;

      // Generar token
      const token = crypto.randomBytes(32).toString("hex");
      const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await db.query(
        "INSERT INTO password_reset_tokens (id_usuario, token, expiracion) VALUES ($1, $2, $3)",
        [idUsuario, token, expiracion]
      );

      const enlace = `http://localhost:5173/enlace-password?token=${token}`;

       console.log("📧 Preparando envío de correo a:", alumnoCorreo);

      // Enviar correo
      await enviarCorreo(
        alumnoCorreo,
        `Matrícula y Detalles del Curso ${nombreCurso} - AulaConnect Educa`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #fdfdfd; color: #333;">
          <h2 style="color: #0056b3; text-align: center; margin-bottom: 10px;">Confirmación de Matrícula</h2>
          <p style="font-size: 15px;">Estimado/a <strong>${alumnoNombre}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6;">
            Nos complace informarle que su inscripción en el curso de 
            <strong style="color:#0056b3;">${nombreCurso}</strong> ha sido confirmada exitosamente.
          </p>
          <h3 style="margin-top: 20px; color: #444;">📌 Información del Curso</h3>
          <ul style="font-size: 15px; line-height: 1.6;">
            <li><strong>Duración:</strong> ${duracionCurso} horas</li>
            <li><strong>Fecha de inicio:</strong> Por Determinar</li>
            <li><strong>Fecha de término:</strong> Por Determinar</li>
            <li><strong>Modalidad:</strong> En línea en <a href="https://cfaeduca.cl/aula-virtual/" style="color:#0056b3;">CFA</a></li>
          </ul>
          <h3 style="margin-top: 20px; color: #444;">💳 Información de Pago</h3>
          <p style="font-size: 15px; line-height: 1.6;">
            Monto pendiente: <strong>$${montoTotal.toLocaleString()}</strong><br>
            Fecha límite de pago: <strong>${fechaLimiteFormateada}</strong>
          </p>
          <h3 style="margin-top: 20px; color: #444;">🔑 Detalles de Acceso</h3>
          <p style="font-size: 15px; line-height: 1.6;">
            Su usuario será su <strong>Correo Electrónico Personal</strong>.<br>
            Ejemplo: si su correo es <strong>correo@gmail.com</strong>, su usuario será <strong>correo@gmail.com</strong>.
          </p>
          <p style="font-size: 15px; line-height: 1.6;">
            Antes de ingresar por primera vez, debe crear su contraseña personal en el siguiente enlace:
          </p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${enlace}" 
              style="display: inline-block; padding: 12px 24px; background-color: #0056b3; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Crear mi contraseña
            </a>
          </p>
          <p style="font-size: 14px; color: #888;">
            Este enlace es válido por <strong>1 hora</strong>.
          </p>
          <p style="font-size: 15px; line-height: 1.6; margin-top: 20px;">
            ¡Le deseamos mucho éxito en su curso! 🚀
          </p>
          <p style="text-align: center; font-size: 14px; color: #777; margin-top: 30px;">
            Atentamente,<br><strong>AulaConnect Educa</strong>
          </p>
        </div>
        `
      );
       console.log("✅ Correo enviado (o al menos enviado a transporter) a:", alumnoCorreo);
    }

    res.json({
      success: true,
      message: "Alumno matriculado, deuda creada y correo enviado exitosamente",
      id_alumno_curso,
      id_deuda,
      fecha_limite: fechaLimite,
    });
  } catch (error) {
    console.error("Error en /matricular:", error);
    res.status(500).json({
      success: false,
      error: "Error en la base de datos o servidor",
    });
  }
});

// Retirar alumno
router.put("/retirar/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { estadoActual } = req.body;
    const nuevoEstado = estadoActual === "activo" ? "retirado" : "activo";

    await db.query("UPDATE alumno_curso SET estado = $1 WHERE id = $2", [
      nuevoEstado,
      id,
    ]);

    res.json({ success: true, message: `Alumno ${nuevoEstado}`, nuevoEstado });
  } catch (error) {
    console.error("Error al cambiar estado del alumno:", error);
    res.status(500).json({ success: false, error: "Error en servidor" });
  }
});

// Obtener matrículas
router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT ac.id, ac.rut_alumno AS rut, a.nombre_completo, c.nombre_curso AS curso, ac.estado
      FROM alumno_curso ac
      JOIN alumno a ON ac.rut_alumno = a.rut
      JOIN curso c ON ac.id_curso = c.id_curso
      ORDER BY ac.fecha_inscripcion DESC
    `;
    const result = await db.query(sql);
    res.json({ success: true, matriculas: result.rows });
  } catch (error) {
    console.error("Error al obtener matrículas:", error);
    res
      .status(500)
      .json({ success: false, error: "Error en la base de datos" });
  }
});

// Obtener cursos de un alumno
router.get("/cursos/:rut_alumno", async (req, res) => {
  try {
    const { rut_alumno } = req.params;
    const sql = `
      SELECT 
        c.id_curso, 
        c.nombre_curso, 
        c.descripcion, 
        c.costo_curso, 
        c.codigo_curso, 
        c.duracion_curso, 
        c.url_aula, 
        ac.fecha_inscripcion,
        CASE WHEN d.estado = 'pendiente' THEN true ELSE false END AS deuda_pendiente
      FROM curso c
      JOIN alumno_curso ac ON c.id_curso = ac.id_curso
      LEFT JOIN deuda d ON d.id_alumno_curso = ac.id
      WHERE ac.rut_alumno = $1
      ORDER BY ac.fecha_inscripcion DESC
    `;
    const result = await db.query(sql, [rut_alumno]);
    res.json({ success: true, cursos: result.rows });
  } catch (error) {
    console.error("Error al obtener cursos del alumno:", error);
    res
      .status(500)
      .json({ success: false, error: "Error en la base de datos" });
  }
});

export default router;
