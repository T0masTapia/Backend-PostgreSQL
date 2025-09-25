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
const db_1 = __importDefault(require("../db")); // aquí tu cliente pg ya configurado
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Configuración de multer
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/becas';
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `beca_${Date.now()}${ext}`);
    }
});
const upload = (0, multer_1.default)({ storage });
// Obtener todas las becas
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sql = 'SELECT * FROM beca ORDER BY id_beca';
        const result = yield db_1.default.query(sql);
        res.json({ success: true, becas: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Error al obtener becas: ' + err.message });
    }
}));
// Obtener beca por ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const sql = 'SELECT * FROM beca WHERE id_beca = $1';
        const result = yield db_1.default.query(sql, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Beca no encontrada' });
        res.json({ success: true, beca: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Error al obtener beca: ' + err.message });
    }
}));
// Crear nueva beca con imagen
router.post('/', upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield db_1.default.query(sql, [
            nombre_beca,
            monto_descuento,
            fecha_inicio,
            fecha_fin,
            criterios || '',
            estado || 'activa',
            imagePath
        ]);
        res.json({ success: true, id_beca: result.rows[0].id_beca });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Error al crear beca: ' + err.message });
    }
}));
// Actualizar beca (PATCH)
router.patch('/:id', upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado } = req.body;
    const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : req.body.image || null;
    const fields = [];
    const values = [];
    if (nombre_beca !== undefined) {
        fields.push("nombre_beca = $" + (values.length + 1));
        values.push(nombre_beca);
    }
    if (monto_descuento !== undefined) {
        fields.push("monto_descuento = $" + (values.length + 1));
        values.push(monto_descuento);
    }
    if (fecha_inicio !== undefined) {
        fields.push("fecha_inicio = $" + (values.length + 1));
        values.push(fecha_inicio);
    }
    if (fecha_fin !== undefined) {
        fields.push("fecha_fin = $" + (values.length + 1));
        values.push(fecha_fin);
    }
    if (criterios !== undefined) {
        fields.push("criterios = $" + (values.length + 1));
        values.push(criterios);
    }
    if (estado !== undefined) {
        fields.push("estado = $" + (values.length + 1));
        values.push(estado);
    }
    if (imagePath !== null) {
        fields.push("image = $" + (values.length + 1));
        values.push(imagePath);
    }
    if (fields.length === 0)
        return res.status(400).json({ success: false, error: "No se enviaron campos para actualizar" });
    const sql = `UPDATE beca SET ${fields.join(", ")} WHERE id_beca = $${values.length + 1}`;
    values.push(id);
    try {
        yield db_1.default.query(sql, values);
        res.json({ success: true, message: "Beca actualizada correctamente" });
    }
    catch (err) {
        res.status(500).json({ success: false, error: "Error al actualizar beca: " + err.message });
    }
}));
// Eliminar beca
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const sql = 'DELETE FROM beca WHERE id_beca = $1';
        yield db_1.default.query(sql, [id]);
        res.json({ success: true, message: 'Beca eliminada correctamente' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Error al eliminar beca: ' + err.message });
    }
}));
// Servir imágenes estáticas
router.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
exports.default = router;
