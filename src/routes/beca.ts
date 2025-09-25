<<<<<<< HEAD
import express from 'express';
import db from '../db'; // aquí tu cliente pg ya configurado
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/becas';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `beca_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Obtener todas las becas
router.get('/', async (req, res) => {
  try {
    const sql = 'SELECT * FROM beca ORDER BY id_beca';
    const result = await db.query(sql);
    res.json({ success: true, becas: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al obtener becas: ' + err.message });
  }
});

// Obtener beca por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sql = 'SELECT * FROM beca WHERE id_beca = $1';
    const result = await db.query(sql, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Beca no encontrada' });
    res.json({ success: true, beca: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al obtener beca: ' + err.message });
  }
});

// Crear nueva beca con imagen
router.post('/', upload.single('image'), async (req, res) => {
  const { nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado } = req.body;
  const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : '';

  if (!nombre_beca || !monto_descuento || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: 'Datos incompletos' });
  }

  try {
    const sql = `
      INSERT INTO beca (nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado, image)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id_beca
    `;
    const result = await db.query(sql, [
      nombre_beca, 
      monto_descuento, 
      fecha_inicio, 
      fecha_fin, 
      criterios || '', 
      estado || 'activa', 
      imagePath
    ]);

    res.json({ success: true, id_beca: result.rows[0].id_beca });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al crear beca: ' + err.message });
  }
});

// Actualizar beca (PATCH)
router.patch('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado } = req.body;
  const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : req.body.image || null;

  const fields: string[] = [];
  const values: any[] = [];

  if (nombre_beca !== undefined) { fields.push("nombre_beca = $"+(values.length+1)); values.push(nombre_beca); }
  if (monto_descuento !== undefined) { fields.push("monto_descuento = $"+(values.length+1)); values.push(monto_descuento); }
  if (fecha_inicio !== undefined) { fields.push("fecha_inicio = $"+(values.length+1)); values.push(fecha_inicio); }
  if (fecha_fin !== undefined) { fields.push("fecha_fin = $"+(values.length+1)); values.push(fecha_fin); }
  if (criterios !== undefined) { fields.push("criterios = $"+(values.length+1)); values.push(criterios); }
  if (estado !== undefined) { fields.push("estado = $"+(values.length+1)); values.push(estado); }
  if (imagePath !== null) { fields.push("image = $"+(values.length+1)); values.push(imagePath); }

  if (fields.length === 0) return res.status(400).json({ success: false, error: "No se enviaron campos para actualizar" });

  const sql = `UPDATE beca SET ${fields.join(", ")} WHERE id_beca = $${values.length+1}`;
  values.push(id);

  try {
    await db.query(sql, values);
    res.json({ success: true, message: "Beca actualizada correctamente" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Error al actualizar beca: " + err.message });
  }
});

// Eliminar beca
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sql = 'DELETE FROM beca WHERE id_beca = $1';
    await db.query(sql, [id]);
    res.json({ success: true, message: 'Beca eliminada correctamente' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al eliminar beca: ' + err.message });
  }
});

// Servir imágenes estáticas
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

export default router;
=======
import express from 'express';
import db from '../db'; // aquí tu cliente pg ya configurado
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/becas';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `beca_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Obtener todas las becas
router.get('/', async (req, res) => {
  try {
    const sql = 'SELECT * FROM beca ORDER BY id_beca';
    const result = await db.query(sql);
    res.json({ success: true, becas: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al obtener becas: ' + err.message });
  }
});

// Obtener beca por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sql = 'SELECT * FROM beca WHERE id_beca = $1';
    const result = await db.query(sql, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Beca no encontrada' });
    res.json({ success: true, beca: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al obtener beca: ' + err.message });
  }
});

// Crear nueva beca con imagen
router.post('/', upload.single('image'), async (req, res) => {
  const { nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado } = req.body;
  const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : '';

  if (!nombre_beca || !monto_descuento || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: 'Datos incompletos' });
  }

  try {
    const sql = `
      INSERT INTO beca (nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado, image)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id_beca
    `;
    const result = await db.query(sql, [
      nombre_beca, 
      monto_descuento, 
      fecha_inicio, 
      fecha_fin, 
      criterios || '', 
      estado || 'activa', 
      imagePath
    ]);

    res.json({ success: true, id_beca: result.rows[0].id_beca });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al crear beca: ' + err.message });
  }
});

// Actualizar beca (PATCH)
router.patch('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado } = req.body;
  const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : req.body.image || null;

  const fields: string[] = [];
  const values: any[] = [];

  if (nombre_beca !== undefined) { fields.push("nombre_beca = $"+(values.length+1)); values.push(nombre_beca); }
  if (monto_descuento !== undefined) { fields.push("monto_descuento = $"+(values.length+1)); values.push(monto_descuento); }
  if (fecha_inicio !== undefined) { fields.push("fecha_inicio = $"+(values.length+1)); values.push(fecha_inicio); }
  if (fecha_fin !== undefined) { fields.push("fecha_fin = $"+(values.length+1)); values.push(fecha_fin); }
  if (criterios !== undefined) { fields.push("criterios = $"+(values.length+1)); values.push(criterios); }
  if (estado !== undefined) { fields.push("estado = $"+(values.length+1)); values.push(estado); }
  if (imagePath !== null) { fields.push("image = $"+(values.length+1)); values.push(imagePath); }

  if (fields.length === 0) return res.status(400).json({ success: false, error: "No se enviaron campos para actualizar" });

  const sql = `UPDATE beca SET ${fields.join(", ")} WHERE id_beca = $${values.length+1}`;
  values.push(id);

  try {
    await db.query(sql, values);
    res.json({ success: true, message: "Beca actualizada correctamente" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Error al actualizar beca: " + err.message });
  }
});

// Eliminar beca
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sql = 'DELETE FROM beca WHERE id_beca = $1';
    await db.query(sql, [id]);
    res.json({ success: true, message: 'Beca eliminada correctamente' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error al eliminar beca: ' + err.message });
  }
});

// Servir imágenes estáticas
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

export default router;
>>>>>>> 5fb615d (A)
