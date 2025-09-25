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
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
// Obtener todos los cursos
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT * FROM curso');
        res.json({ success: true, cursos: result.rows });
    }
    catch (err) {
        console.error('Error al obtener cursos:', err);
        res.status(500).json({ success: false, error: 'Error al obtener los cursos' });
    }
}));
// Obtener total de cursos
router.get('/total', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT COUNT(*) AS total FROM curso');
        res.json({ success: true, total: parseInt(result.rows[0].total, 10) });
    }
    catch (err) {
        console.error('Error al contar cursos:', err);
        res.status(500).json({ success: false, error: 'Error al obtener total de cursos' });
    }
}));
// Añadir nuevo curso
router.post('/crear-curso', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield db_1.default.query(sql, [nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso, url_aula || null]);
        res.json({ success: true, message: 'Curso creado exitosamente', id: result.rows[0].id_curso });
    }
    catch (err) {
        console.error('Error al insertar curso:', err);
        res.status(500).json({ success: false, error: 'Error al crear el curso' });
    }
}));
// Editar curso
router.patch('/:idCurso', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idCurso } = req.params;
    const fields = req.body;
    if (Object.keys(fields).length === 0) {
        return res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
    }
    const setFields = Object.keys(fields).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(fields);
    try {
        yield db_1.default.query(`UPDATE curso SET ${setFields} WHERE id_curso = $${values.length + 1}`, [...values, idCurso]);
        res.json({ success: true, message: 'Curso actualizado correctamente' });
    }
    catch (err) {
        console.error('Error al actualizar curso:', err);
        res.status(500).json({ success: false, error: 'Error al actualizar curso' });
    }
}));
// Eliminar curso
router.delete('/:idCurso', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idCurso } = req.params;
    try {
        const check = yield db_1.default.query('SELECT COUNT(*) AS total FROM alumno_curso WHERE id_curso = $1', [idCurso]);
        const totalAlumnos = parseInt(check.rows[0].total, 10);
        if (totalAlumnos > 0) {
            return res.status(400).json({ success: false, error: 'No se puede eliminar el curso porque tiene alumnos inscritos' });
        }
        yield db_1.default.query('DELETE FROM curso WHERE id_curso = $1', [idCurso]);
        res.json({ success: true, message: 'Curso eliminado correctamente' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error al eliminar curso' });
    }
}));
// Obtener alumnos por ID de curso
router.get('/:idCurso/alumnos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idCurso } = req.params;
    try {
        const sql = `
      SELECT a.rut, a.nombre_completo
      FROM alumno a
      JOIN alumno_curso ac ON a.rut = ac.rut_alumno
      WHERE ac.id_curso = $1
    `;
        const result = yield db_1.default.query(sql, [idCurso]);
        res.json({ success: true, alumnos: result.rows });
    }
    catch (err) {
        console.error('Error al obtener alumnos:', err);
        res.status(500).json({ success: false, error: 'Error al obtener alumnos del curso' });
    }
}));
exports.default = router;
