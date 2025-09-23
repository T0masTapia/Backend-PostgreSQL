// routes/pago.ts
import express from "express";
import db from "../db";
import { enviarCorreo } from "../utils/correo";
import { generarBoletaPDF } from "../utils/boleta";

const router = express.Router();

// Función para generar número de boleta único
async function generarNumBoletaUnico(): Promise<number> {
  let num_boleta: number;
  let existe: boolean;

  do {
    num_boleta = Math.floor(10000000 + Math.random() * 90000000); // 8 dígitos
    const result = await db.query(
      `SELECT id FROM boleta WHERE num_boleta = $1`,
      [num_boleta]
    );
    existe = result.rows.length > 0;
  } while (existe);

  return num_boleta;
}

// POST /pago
router.post("/", async (req, res) => {
  try {
    const { id_deuda, monto, tipoPago, conceptoPago } = req.body;

    if (!id_deuda || !monto || !tipoPago || !conceptoPago) {
      return res.status(400).json({ success: false, error: "Faltan datos" });
    }

    if (!["abono", "total"].includes(tipoPago)) {
      return res
        .status(400)
        .json({ success: false, error: "Tipo de pago inválido" });
    }

    const fecha_pago = new Date();

    // 1️⃣ Insertar pago y obtener id generado
    const insertPago = await db.query(
      `INSERT INTO pago (id_deuda, monto, fecha_pago, tipo_pago, concepto_pago)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_pago`,
      [id_deuda, monto, fecha_pago, tipoPago, conceptoPago]
    );
    const id_pago = insertPago.rows[0].id_pago;

    // 2️⃣ Actualizar deuda
    await db.query(`UPDATE deuda SET monto = monto - $1 WHERE id_deuda = $2`, [
      monto,
      id_deuda,
    ]);

    // 3️⃣ Obtener información actual de la deuda
    const deudaResult = await db.query(
      `SELECT monto, id_alumno_curso, descripcion, costo_matricula 
       FROM deuda WHERE id_deuda = $1`,
      [id_deuda]
    );
    const deuda = deudaResult.rows[0];
    const montoActual = deuda.monto;
    const idAlumnoCurso = deuda.id_alumno_curso;
    const descripcionDeuda = deuda.descripcion;
    const costoMatricula = deuda.costo_matricula;

    // 4️⃣ Si monto <= 0, marcar deuda como pagada
    if (montoActual <= 0) {
      await db.query(
        `UPDATE deuda SET estado = 'pagado', monto = 0 WHERE id_deuda = $1`,
        [id_deuda]
      );
    }

    // 5️⃣ Obtener información del alumno + curso
    const alumnoCursoResult = await db.query(
      `SELECT 
          u.correo, 
          a.nombre_completo, 
          a.rut AS rut_alumno,
          a.fono,
          c.codigo_curso,
          c.nombre_curso,
          c.descripcion,
          c.duracion_curso,
          c.costo_curso
       FROM alumno_curso ac
       JOIN alumno a ON ac.rut_alumno = a.rut
       JOIN usuario u ON u.id_usuario = a.id_usuario
       JOIN curso c ON ac.id_curso = c.id_curso
       WHERE ac.id = $1`,
      [idAlumnoCurso]
    );

    if (alumnoCursoResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Alumno o curso no encontrado" });
    }

    const alumnoCurso = alumnoCursoResult.rows[0];
    const correoAlumno = alumnoCurso.correo;
    const nombreAlumno = alumnoCurso.nombre_completo;
    const rutAlumno = alumnoCurso.rut_alumno;
    const fonoAlumno = alumnoCurso.fono;

    // Objeto curso
    const curso = {
      codigo: alumnoCurso.codigo_curso,
      nombre: alumnoCurso.nombre_curso,
      descripcion: alumnoCurso.descripcion,
      duracion: alumnoCurso.duracion_curso,
      monto: alumnoCurso.costo_curso,
    };

    // Determinar si incluir matrícula en la boleta
    const incluirMatricula = costoMatricula > 0;
    const montoMatricula = incluirMatricula ? costoMatricula : 0;

    // 🔹 Generar número de boleta único
    const num_boleta = await generarNumBoletaUnico();

    // 🔹 Insertar boleta en la tabla
    await db.query(
      `INSERT INTO boleta (id_pago, num_boleta) VALUES ($1, $2)`,
      [id_pago, num_boleta]
    );

    // Generar mensaje HTML
    const mensaje = `
      <h3>Comprobante de pago</h3>
      <p>Hola <strong>${nombreAlumno}</strong>, Informamos que su pago fue procesado con éxito.</p>
      <p>Adjunto encontrarás Boleta Electrónica <strong>N°${num_boleta}</strong></p>
      <p>Se ha registrado un pago de <strong>$${monto.toLocaleString()}</strong> (${tipoPago} - ${conceptoPago}).</p>
      <p>Deuda restante: <strong>$${montoActual <= 0 ? 0 : montoActual.toLocaleString()}</strong></p>
      <p>Curso: <strong>${curso.nombre}</strong></p>
      <p>Duración del Curso: <strong>${curso.duracion}</strong> hrs</p>
      <p>Descripción: <strong>${curso.descripcion}</strong></p>
      <p>Gracias por tu pago.</p>
    `;

    // 6️⃣ Generar PDF de la boleta
    try {
      const boletaPDF = await generarBoletaPDF(
        {
          rut: rutAlumno,
          nombre: nombreAlumno,
          correo: correoAlumno,
          fono: fonoAlumno,
        },
        {
          descripcion: descripcionDeuda,
          monto,
          fecha: fecha_pago,
          num_boleta,
        },
        curso,
        {
          incluirMatricula,
          montoMatricula,
        }
      );

      await enviarCorreo(
        correoAlumno,
        "Comprobante de pago CFA Educa",
        mensaje,
        [
          {
            filename: `Boleta_${rutAlumno}.pdf`,
            content: boletaPDF,
            contentType: "application/pdf",
          },
        ]
      );

      console.log("Correo de boleta enviado a", correoAlumno);
    } catch (e) {
      console.error("Error generando o enviando boleta PDF:", e);
    }

    return res.json({
      success: true,
      message:
        montoActual <= 0
          ? "Pago registrado, boleta creada y deuda pagada correctamente"
          : "Pago registrado y boleta creada correctamente",
      num_boleta,
    });
  } catch (err) {
    console.error("Error en /pago:", err);
    res
      .status(500)
      .json({ success: false, error: "Error en la base de datos o servidor" });
  }
});

/**
 * Obtener pagos por deuda específica
 * GET /pago/deuda/:id
 */
router.get("/deuda/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id_pago, monto, fecha_pago, tipo_pago, concepto_pago
       FROM pago
       WHERE id_deuda = $1
       ORDER BY fecha_pago DESC`,
      [id]
    );
    res.json({ success: true, pagos: result.rows });
  } catch (err) {
    console.error("Error al obtener pagos por deuda:", err);
    res
      .status(500)
      .json({ success: false, error: "Error en la base de datos" });
  }
});

export default router;
