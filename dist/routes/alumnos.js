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
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = express_1.default.Router();
// GET todos los alumnos con correo del usuario
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT a.rut, a.nombre_completo, a.direccion, a.fono, u.correo
      FROM alumno a
      JOIN usuario u ON a.id_usuario = u.id_usuario
    `;
        const result = yield db_1.default.query(query);
        res.json({ success: true, alumnos: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener alumnos: ' + err.message });
    }
}));
// Buscar alumnos por coincidencia parcial del RUT
router.get('/buscar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const termino = req.query.rut;
    if (!termino)
        return res.status(400).json({ error: 'Falta término de búsqueda' });
    try {
        const query = `
      SELECT rut, nombre_completo
      FROM alumno
      WHERE rut LIKE $1
      LIMIT 10
    `;
        const result = yield db_1.default.query(query, [`%${termino}%`]);
        res.json({ success: true, alumnos: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al buscar rut: ' + err.message });
    }
}));
// Total de alumnos
router.get('/total', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`SELECT COUNT(*) AS total FROM alumno`);
        res.json({ success: true, total: parseInt(result.rows[0].total) });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al contar alumnos: ' + err.message });
    }
}));
// Obtener cursos de un alumno por RUT
router.get('/:rut/cursos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rut = req.params.rut;
    try {
        const query = `
      SELECT COUNT(*) AS total
      FROM curso c
      JOIN alumno_curso ac ON c.id_curso = ac.id_curso
      JOIN alumno a ON ac.rut_alumno = a.rut
      WHERE a.rut = $1
    `;
        const result = yield db_1.default.query(query, [rut]);
        res.json({ success: true, total: parseInt(result.rows[0].total) });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
}));
// Crear alumno
router.post('/crear', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rut, nombre_completo, direccion, fono, correo, password } = req.body;
    if (!rut || !nombre_completo || !correo || !password)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    try {
        // Verificar si el correo ya existe
        const correoExistente = yield db_1.default.query('SELECT COUNT(*) AS total FROM usuario WHERE correo = $1', [correo]);
        if (parseInt(correoExistente.rows[0].total) > 0)
            return res.status(400).json({ error: 'El correo ya está registrado' });
        // Hashear contraseña
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Insertar usuario
        const usuarioResult = yield db_1.default.query(`INSERT INTO usuario (correo, password, tipo_usuario) VALUES ($1, $2, 'alumno') RETURNING id_usuario`, [correo, hashedPassword]);
        const id_usuario = usuarioResult.rows[0].id_usuario;
        // Insertar alumno
        yield db_1.default.query(`INSERT INTO alumno (rut, nombre_completo, direccion, id_usuario, fono)
       VALUES ($1, $2, $3, $4, $5)`, [rut, nombre_completo, direccion, id_usuario, fono]);
        res.json({ success: true, message: 'Alumno creado correctamente' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error al crear alumno: ' + err.message });
    }
}));
// Obtener alumno por RUT
router.get('/:rut', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rut = req.params.rut;
    try {
        const query = `
      SELECT a.rut, a.nombre_completo, a.direccion, a.fono, u.correo
      FROM alumno a
      JOIN usuario u ON a.id_usuario = u.id_usuario
      WHERE a.rut = $1
      LIMIT 1
    `;
        const result = yield db_1.default.query(query, [rut]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Alumno no encontrado' });
        res.json({ success: true, alumno: result.rows[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
}));
// Actualizar alumno
router.patch('/:rut', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rut = req.params.rut;
    const { nombre, fono, direccion, correo } = req.body;
    try {
        const updates = [];
        const values = [];
        if (nombre) {
            updates.push('nombre_completo = $' + (values.length + 1));
            values.push(nombre);
        }
        if (fono) {
            updates.push('fono = $' + (values.length + 1));
            values.push(fono);
        }
        if (direccion) {
            updates.push('direccion = $' + (values.length + 1));
            values.push(direccion);
        }
        if (updates.length > 0) {
            const queryAlumno = `UPDATE alumno SET ${updates.join(', ')} WHERE rut = $${values.length + 1}`;
            values.push(rut);
            yield db_1.default.query(queryAlumno, values);
        }
        if (correo) {
            const queryUsuario = `
        UPDATE usuario u
        SET correo = $1
        FROM alumno a
        WHERE a.id_usuario = u.id_usuario AND a.rut = $2
      `;
            yield db_1.default.query(queryUsuario, [correo, rut]);
        }
        res.json({ success: true, message: 'Alumno actualizado correctamente' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
}));
// Eliminar alumno
router.delete('/:rut', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rut = req.params.rut;
    try {
        // Obtener id_usuario
        const result = yield db_1.default.query(`SELECT id_usuario FROM alumno WHERE rut = $1`, [rut]);
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Alumno no encontrado' });
        const id_usuario = result.rows[0].id_usuario;
        // Eliminar alumno
        yield db_1.default.query(`DELETE FROM alumno WHERE rut = $1`, [rut]);
        // Eliminar usuario
        yield db_1.default.query(`DELETE FROM usuario WHERE id_usuario = $1`, [id_usuario]);
        res.json({ success: true, message: 'Alumno eliminado correctamente' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
}));
exports.default = router;
