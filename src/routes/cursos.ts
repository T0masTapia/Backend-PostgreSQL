import express from 'express';
import db from '../db';

const router = express.Router();

// Obtener todos los cursos
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM curso');
    res.json({ success: true, cursos: result.rows });
  } catch (err: any) {
    console.error('Error al obtener cursos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener los cursos' });
  }
});

// Obtener total de cursos
router.get('/total', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) AS total FROM curso');
    res.json({ success: true, total: parseInt(result.rows[0].total, 10) });
  } catch (err: any) {
    console.error('Error al contar cursos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener total de cursos' });
  }
});

// Añadir nuevo curso
router.post('/crear-curso', async (req, res) => {
  const { nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso, url_aula } = req.body;

  if (!nombre_curso || !descripcion || costo_curso == null || !codigo_curso || !duracion_curso) {
    return res.status(400).json({ success: false, error: 'Faltan datos del curso' });
  }

  try {
    const sql = `
      INSERT INTO curso (nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso, url_aula)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_curso
    `;
    const result = await db.query(sql, [nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso, url_aula || null]);
    res.json({ success: true, message: 'Curso creado exitosamente', id: result.rows[0].id_curso });
  } catch (err: any) {
    console.error('Error al insertar curso:', err);
    res.status(500).json({ success: false, error: 'Error al crear el curso' });
  }
});

// Editar curso
router.patch('/:idCurso', async (req, res) => {
  const { idCurso } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
  }

  const setFields = Object.keys(fields).map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = Object.values(fields);

  try {
    await db.query(`UPDATE curso SET ${setFields} WHERE id_curso = $${values.length + 1}`, [...values, idCurso]);
    res.json({ success: true, message: 'Curso actualizado correctamente' });
  } catch (err: any) {
    console.error('Error al actualizar curso:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar curso' });
  }
});

// Eliminar curso
router.delete('/:idCurso', async (req, res) => {
  const { idCurso } = req.params;
  try {
    const check = await db.query('SELECT COUNT(*) AS total FROM alumno_curso WHERE id_curso = $1', [idCurso]);
    const totalAlumnos = parseInt(check.rows[0].total, 10);
    if (totalAlumnos > 0) {
      return res.status(400).json({ success: false, error: 'No se puede eliminar el curso porque tiene alumnos inscritos' });
    }

    await db.query('DELETE FROM curso WHERE id_curso = $1', [idCurso]);
    res.json({ success: true, message: 'Curso eliminado correctamente' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al eliminar curso' });
  }
});

// Obtener alumnos por ID de curso
router.get('/:idCurso/alumnos', async (req, res) => {
  const { idCurso } = req.params;
  try {
    const sql = `
      SELECT a.rut, a.nombre_completo
      FROM alumno a
      JOIN alumno_curso ac ON a.rut = ac.rut_alumno
      WHERE ac.id_curso = $1
    `;
    const result = await db.query(sql, [idCurso]);
    res.json({ success: true, alumnos: result.rows });
  } catch (err: any) {
    console.error('Error al obtener alumnos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener alumnos del curso' });
  }
});

export default router;
