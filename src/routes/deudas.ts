// routes/deudas.ts
import express from "express";
import db from "../db";

const router = express.Router();

// Obtener todas las deudas
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM deuda");
    res.json({ success: true, deudas: result.rows });
  } catch (err) {
    console.error("Error al obtener las deudas:", err);
    res.status(500).json({ success: false, error: "Error en la base de datos" });
  }
});


// routes/deudas.ts
router.get("/con-deuda", async (req, res) => {
  const sql = `
    SELECT 
        d.id_deuda,
        a.rut,
        a.nombre_completo,
        u.correo,
        d.costo_matricula - COALESCE(SUM(CASE WHEN p.concepto_pago = 'matricula' THEN p.monto END), 0) AS deudaMatricula,
        d.costo_cursos - COALESCE(SUM(CASE WHEN p.concepto_pago = 'curso' THEN p.monto END), 0) AS deudaCursos,
        (d.costo_matricula - COALESCE(SUM(CASE WHEN p.concepto_pago = 'matricula' THEN p.monto END), 0))
        + (d.costo_cursos - COALESCE(SUM(CASE WHEN p.concepto_pago = 'curso' THEN p.monto END), 0)) AS deuda_total,
        c.nombre_curso AS cursoPendiente
    FROM deuda d
    JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
    JOIN alumno a ON ac.rut_alumno = a.rut
    JOIN usuario u ON u.id_usuario = a.id_usuario
    JOIN curso c ON ac.id_curso = c.id_curso
    LEFT JOIN pago p ON p.id_deuda = d.id_deuda
    WHERE d.estado = 'pendiente'
    GROUP BY d.id_deuda, a.rut, a.nombre_completo, u.correo, d.costo_matricula, d.costo_cursos, c.nombre_curso
    HAVING (d.costo_matricula - COALESCE(SUM(CASE WHEN p.concepto_pago = 'matricula' THEN p.monto END), 0))
          + (d.costo_cursos - COALESCE(SUM(CASE WHEN p.concepto_pago = 'curso' THEN p.monto END), 0)) > 0
    ORDER BY a.nombre_completo, c.nombre_curso
  `;

  try {
    const result = await db.query(sql);
    res.json({ success: true, alumnos: result.rows });
  } catch (err) {
    console.error("Error al obtener alumnos con deuda:", err);
    res.status(500).json({ success: false, error: "Error en la base de datos" });
  }
});


// Obtener total de deudas pendientes
router.get("/total-pendientes", async (req, res) => {
  try {
    const result = await db.query(`SELECT COUNT(*) AS total FROM deuda WHERE estado = 'pendiente'`);
    res.json({ success: true, total: parseInt(result.rows[0].total, 10) });
  } catch (err) {
    console.error("Error al contar deudas pendientes:", err);
    res.status(500).json({ success: false, error: "Error en la base de datos" });
  }
});

// Obtener transacciones (deudas y pagos) de un alumno
router.get("/alumno/:rut", async (req, res) => {
  const { rut } = req.params;
  const { desde, hasta } = req.query;

  const params: (string | number)[] = [rut];
  let paramIndex = 2; // porque $1 ya es rut

  let sql = `
    SELECT 
      d.id_deuda AS id_deuda,
      d.fecha_deuda AS fecha,
      d.descripcion,
      d.monto AS monto,
      'Ingreso' AS tipo
    FROM deuda d
    JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
    WHERE ac.rut_alumno = $1
  `;

  if (desde) {
    sql += ` AND d.fecha_deuda >= $${paramIndex++}`;
    params.push(String(desde));
  }
  if (hasta) {
    sql += ` AND d.fecha_deuda <= $${paramIndex++}`;
    params.push(String(hasta));
  }

  sql += `
    UNION ALL
    SELECT
      p.id_deuda AS id_deuda,
      p.fecha_pago AS fecha,
      ('Pago: ' || p.concepto_pago) AS descripcion,
      -p.monto AS monto,
      'Gasto' AS tipo
    FROM pago p
    JOIN deuda d2 ON p.id_deuda = d2.id_deuda
    JOIN alumno_curso ac2 ON d2.id_alumno_curso = ac2.id
    WHERE ac2.rut_alumno = $1
  `;

  if (desde) {
    sql += ` AND p.fecha_pago >= $${paramIndex++}`;
    params.push(String(desde));
  }
  if (hasta) {
    sql += ` AND p.fecha_pago <= $${paramIndex++}`;
    params.push(String(hasta));
  }

  sql += " ORDER BY fecha DESC";

  try {
    const result = await db.query(sql, params);
    res.json({ success: true, transacciones: result.rows });
  } catch (err) {
    console.error("Error al obtener transacciones del alumno:", err);
    res.status(500).json({ success: false, error: "Error en la base de datos" });
  }
});

// Contar deudas pendientes de un alumno
router.get("/alumno/:rut/pendientes", async (req, res) => {
  const { rut } = req.params;

  const sql = `
    SELECT COUNT(*) AS total
    FROM deuda d
    JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
    WHERE ac.rut_alumno = $1 AND d.estado = 'pendiente'
  `;

  try {
    const result = await db.query(sql, [rut]);
    res.json({ success: true, total: parseInt(result.rows[0].total, 10) });
  } catch (err) {
    console.error("Error al contar deudas del alumno:", err);
    res.status(500).json({ success: false, error: "Error en la base de datos" });
  }
});

export default router;
