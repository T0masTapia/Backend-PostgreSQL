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
// routes/matricula.ts
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
// GET /matricula - Obtener monto de la matrícula (suponiendo que solo hay un registro con el monto actual)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sql = 'SELECT * FROM matricula LIMIT 1';
        const result = yield db_1.default.query(sql);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No hay monto de matrícula configurado' });
        }
        res.json({ success: true, matricula: result.rows[0] });
    }
    catch (err) {
        console.error('Error al obtener monto de matrícula:', err);
        res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }
}));
// POST /matricula - Crear o actualizar monto de matrícula
// router.post('/', async (req, res) => {
//   const { monto } = req.body;
//   if (monto == null) {
//     return res.status(400).json({ success: false, error: 'Falta el monto de matrícula' });
//   }
//   try {
//     // Verificar si ya existe un registro
//     const checkSql = 'SELECT id_matricula FROM matricula LIMIT 1';
//     const checkResult = await db.query(checkSql);
//     if (checkResult.rows.length === 0) {
//       // No hay registro, insertar
//       const insertSql = `
//         INSERT INTO matricula (monto, fecha_matricula, estado)
//         VALUES ($1, NOW(), 'activo')
//         RETURNING id_matricula
//       `;
//       const insertResult = await db.query(insertSql, [monto]);
//       res.json({ success: true, message: 'Monto de matrícula creado', id: insertResult.rows[0].id_matricula });
//     } else {
//       // Ya existe, actualizar
//       const id = checkResult.rows[0].id_matricula;
//       const updateSql = `
//         UPDATE matricula
//         SET monto = $1, fecha_matricula = NOW(), estado = 'activo'
//         WHERE id_matricula = $2
//       `;
//       await db.query(updateSql, [monto, id]);
//       res.json({ success: true, message: 'Monto de matrícula actualizado' });
//     }
//   } catch (err) {
//     console.error('Error al crear/actualizar matrícula:', err);
//     res.status(500).json({ success: false, error: 'Error en la base de datos' });
//   }
// });
exports.default = router;
