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
// routes/deudas.ts
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
// Obtener todas las deudas
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query("SELECT * FROM deuda");
        res.json({ success: true, deudas: result.rows });
    }
    catch (err) {
        console.error("Error al obtener las deudas:", err);
        res.status(500).json({ success: false, error: "Error en la base de datos" });
    }
}));
// routes/deudas.ts
router.get("/con-deuda", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield db_1.default.query(sql);
        res.json({ success: true, alumnos: result.rows });
    }
    catch (err) {
        console.error("Error al obtener alumnos con deuda:", err);
        res.status(500).json({ success: false, error: "Error en la base de datos" });
    }
}));
// Obtener total de deudas pendientes
router.get("/total-pendientes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`SELECT COUNT(*) AS total FROM deuda WHERE estado = 'pendiente'`);
        res.json({ success: true, total: parseInt(result.rows[0].total, 10) });
    }
    catch (err) {
        console.error("Error al contar deudas pendientes:", err);
        res.status(500).json({ success: false, error: "Error en la base de datos" });
    }
}));
// Obtener transacciones (deudas y pagos) de un alumno
router.get("/alumno/:rut", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rut } = req.params;
    const { desde, hasta } = req.query;
    const params = [rut];
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
        const result = yield db_1.default.query(sql, params);
        res.json({ success: true, transacciones: result.rows });
    }
    catch (err) {
        console.error("Error al obtener transacciones del alumno:", err);
        res.status(500).json({ success: false, error: "Error en la base de datos" });
    }
}));
// Contar deudas pendientes de un alumno
router.get("/alumno/:rut/pendientes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rut } = req.params;
    const sql = `
    SELECT COUNT(*) AS total
    FROM deuda d
    JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
    WHERE ac.rut_alumno = $1 AND d.estado = 'pendiente'
  `;
    try {
        const result = yield db_1.default.query(sql, [rut]);
        res.json({ success: true, total: parseInt(result.rows[0].total, 10) });
    }
    catch (err) {
        console.error("Error al contar deudas del alumno:", err);
        res.status(500).json({ success: false, error: "Error en la base de datos" });
    }
}));
exports.default = router;
