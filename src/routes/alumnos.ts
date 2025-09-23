import express from 'express';
import db from '../db';
import bcrypt from 'bcrypt';

const router = express.Router();

// GET todos los alumnos con correo del usuario
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT a.rut, a.nombre_completo, a.direccion, a.fono, u.correo
      FROM alumno a
      JOIN usuario u ON a.id_usuario = u.id_usuario
    `;
    const result = await db.query(query);
    res.json({ success: true, alumnos: result.rows });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alumnos: ' + err.message });
  }
});

// Buscar alumnos por coincidencia parcial del RUT
router.get('/buscar', async (req, res) => {
  const termino = req.query.rut;
  if (!termino) return res.status(400).json({ error: 'Falta término de búsqueda' });

  try {
    const query = `
      SELECT rut, nombre_completo
      FROM alumno
      WHERE rut LIKE $1
      LIMIT 10
    `;
    const result = await db.query(query, [`%${termino}%`]);
    res.json({ success: true, alumnos: result.rows });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar rut: ' + err.message });
  }
});

// Total de alumnos
router.get('/total', async (req, res) => {
  try {
    const result = await db.query(`SELECT COUNT(*) AS total FROM alumno`);
    res.json({ success: true, total: parseInt(result.rows[0].total) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al contar alumnos: ' + err.message });
  }
});

// Obtener cursos de un alumno por RUT
router.get('/:rut/cursos', async (req, res) => {
  const rut = req.params.rut;
  try {
    const query = `
      SELECT COUNT(*) AS total
      FROM curso c
      JOIN alumno_curso ac ON c.id_curso = ac.id_curso
      JOIN alumno a ON ac.rut_alumno = a.rut
      WHERE a.rut = $1
    `;
    const result = await db.query(query, [rut]);
    res.json({ success: true, total: parseInt(result.rows[0].total) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear alumno
router.post('/crear', async (req, res) => {
  const { rut, nombre_completo, direccion, fono, correo, password } = req.body;
  if (!rut || !nombre_completo || !correo || !password)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });

  try {
    // Verificar si el correo ya existe
    const correoExistente = await db.query(
      'SELECT COUNT(*) AS total FROM usuario WHERE correo = $1',
      [correo]
    );
    if (parseInt(correoExistente.rows[0].total) > 0)
      return res.status(400).json({ error: 'El correo ya está registrado' });

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const usuarioResult = await db.query(
      `INSERT INTO usuario (correo, password, tipo_usuario) VALUES ($1, $2, 'alumno') RETURNING id_usuario`,
      [correo, hashedPassword]
    );
    const id_usuario = usuarioResult.rows[0].id_usuario;

    // Insertar alumno
    await db.query(
      `INSERT INTO alumno (rut, nombre_completo, direccion, id_usuario, fono)
       VALUES ($1, $2, $3, $4, $5)`,
      [rut, nombre_completo, direccion, id_usuario, fono]
    );

    res.json({ success: true, message: 'Alumno creado correctamente' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al crear alumno: ' + err.message });
  }
});

// Obtener alumno por RUT
router.get('/:rut', async (req, res) => {
  const rut = req.params.rut;
  try {
    const query = `
      SELECT a.rut, a.nombre_completo, a.direccion, a.fono, u.correo
      FROM alumno a
      JOIN usuario u ON a.id_usuario = u.id_usuario
      WHERE a.rut = $1
      LIMIT 1
    `;
    const result = await db.query(query, [rut]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Alumno no encontrado' });

    res.json({ success: true, alumno: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar alumno
router.patch('/:rut', async (req, res) => {
  const rut = req.params.rut;
  const { nombre, fono, direccion, correo } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (nombre) { updates.push('nombre_completo = $' + (values.length + 1)); values.push(nombre); }
    if (fono) { updates.push('fono = $' + (values.length + 1)); values.push(fono); }
    if (direccion) { updates.push('direccion = $' + (values.length + 1)); values.push(direccion); }

    if (updates.length > 0) {
      const queryAlumno = `UPDATE alumno SET ${updates.join(', ')} WHERE rut = $${values.length + 1}`;
      values.push(rut);
      await db.query(queryAlumno, values);
    }

    if (correo) {
      const queryUsuario = `
        UPDATE usuario u
        SET correo = $1
        FROM alumno a
        WHERE a.id_usuario = u.id_usuario AND a.rut = $2
      `;
      await db.query(queryUsuario, [correo, rut]);
    }

    res.json({ success: true, message: 'Alumno actualizado correctamente' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar alumno
router.delete('/:rut', async (req, res) => {
  const rut = req.params.rut;
  try {
    // Obtener id_usuario
    const result = await db.query(`SELECT id_usuario FROM alumno WHERE rut = $1`, [rut]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'Alumno no encontrado' });

    const id_usuario = result.rows[0].id_usuario;

    // Eliminar alumno
    await db.query(`DELETE FROM alumno WHERE rut = $1`, [rut]);
    // Eliminar usuario
    await db.query(`DELETE FROM usuario WHERE id_usuario = $1`, [id_usuario]);

    res.json({ success: true, message: 'Alumno eliminado correctamente' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
