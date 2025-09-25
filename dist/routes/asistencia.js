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
const exceljs_1 = __importDefault(require("exceljs"));
const router = express_1.default.Router();
// Obtener toda la asistencia
router.get("/toda", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sql = `
      SELECT a.id_curso, c.nombre_curso, al.rut, al.nombre_completo, asis.fecha, asis.estado
      FROM alumno_curso a
      JOIN alumno al ON a.rut_alumno = al.rut
      JOIN curso c ON a.id_curso = c.id_curso
      LEFT JOIN asistencia asis 
        ON asis.rut_alumno = a.rut_alumno AND asis.id_curso = a.id_curso
      ORDER BY a.id_curso, al.nombre_completo, asis.fecha
    `;
        const result = yield db_1.default.query(sql);
        res.json({ success: true, asistencia: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Error al obtener asistencia" });
    }
}));
// Obtener asistencia de un curso específico
router.get("/toda/curso/:idCurso", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idCurso } = req.params;
    try {
        const sql = `
      SELECT a.id_curso, c.nombre_curso, al.rut, al.nombre_completo, asis.fecha, asis.estado
      FROM alumno_curso a
      JOIN alumno al ON a.rut_alumno = al.rut
      JOIN curso c ON a.id_curso = c.id_curso
      LEFT JOIN asistencia asis 
        ON asis.rut_alumno = a.rut_alumno AND asis.id_curso = a.id_curso
      WHERE a.id_curso = $1
      ORDER BY al.nombre_completo, asis.fecha
    `;
        const result = yield db_1.default.query(sql, [idCurso]);
        const rows = result.rows;
        if (rows.length === 0) {
            return res.json({
                success: true,
                message: "Actualmente no se ha registrado asistencia en este curso",
                asistencia: [],
            });
        }
        const asistenciaProcesada = rows.map((row) => ({
            id_curso: row.id_curso,
            nombre_curso: row.nombre_curso,
            rut: row.rut,
            nombre_completo: row.nombre_completo,
            fecha: row.fecha || null,
            estado: row.estado || "S",
        }));
        res.json({ success: true, asistencia: asistenciaProcesada });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Error al obtener asistencia" });
    }
}));
// Obtener asistencia de un curso en una fecha
router.get("/:idCurso/:fecha", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idCurso, fecha } = req.params;
    try {
        const sql = `
      SELECT a.rut_alumno, al.nombre_completo, asis.estado
      FROM alumno_curso a
      JOIN alumno al ON a.rut_alumno = al.rut
      LEFT JOIN asistencia asis 
        ON asis.rut_alumno = a.rut_alumno 
        AND asis.id_curso = a.id_curso 
        AND asis.fecha = $1
      WHERE a.id_curso = $2
    `;
        const result = yield db_1.default.query(sql, [fecha, idCurso]);
        res.json({ success: true, asistencia: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Error al obtener asistencia" });
    }
}));
// Guardar asistencia (crear o actualizar)
router.post("/guardar-asistencia", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_curso, fecha, asistencias } = req.body;
    if (!id_curso || !fecha || !Array.isArray(asistencias)) {
        return res.status(400).json({ success: false, error: "Datos incompletos" });
    }
    try {
        const promises = asistencias.map(({ rut_alumno, estado }) => {
            return db_1.default.query(`
        INSERT INTO asistencia (rut_alumno, id_curso, fecha, estado)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (rut_alumno, id_curso, fecha) DO UPDATE
        SET estado = EXCLUDED.estado
        `, [rut_alumno, id_curso, fecha, estado]);
        });
        yield Promise.all(promises);
        res.json({ success: true, message: "Asistencia guardada correctamente" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Error al guardar asistencia" });
    }
}));
// Descargar asistencia en Excel
router.get("/descargar/:idCurso/:fecha", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idCurso, fecha } = req.params;
    try {
        // Nombre del curso
        const cursoResult = yield db_1.default.query(`SELECT nombre_curso FROM curso WHERE id_curso = $1`, [idCurso]);
        if (cursoResult.rows.length === 0) {
            return res.status(404).send("Curso no encontrado");
        }
        const nombreCurso = cursoResult.rows[0].nombre_curso.replace(/\s+/g, "_");
        // Obtener asistencia
        const sql = `
      SELECT 
        al.rut, al.nombre_completo, u.correo, al.fono, asis.estado
      FROM alumno_curso a
      JOIN alumno al ON a.rut_alumno = al.rut
      JOIN usuario u ON al.id_usuario = u.id_usuario
      LEFT JOIN asistencia asis 
        ON asis.rut_alumno = a.rut_alumno AND asis.id_curso = a.id_curso AND asis.fecha = $1
      WHERE a.id_curso = $2
    `;
        const result = yield db_1.default.query(sql, [fecha, idCurso]);
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Asistencia");
        worksheet.columns = [
            { header: "Apellido", key: "apellido", width: 30 },
            { header: "Nombre", key: "nombre", width: 30 },
            { header: "RUT", key: "rut", width: 20 },
            { header: "Correo", key: "correo", width: 30 },
            { header: "Fono", key: "fono", width: 15 },
            { header: "Asistencia", key: "asistencia", width: 15 },
        ];
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1976D2" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
        const separarApellidosYNombres = (nombreCompleto) => {
            const partes = nombreCompleto.trim().split(/\s+/);
            if (partes.length <= 2)
                return { nombre: partes[0], apellido: partes[1] || "" };
            const apellido = partes.slice(-2).join(" ");
            const nombre = partes.slice(0, -2).join(" ");
            return { nombre, apellido };
        };
        const colorAsistencia = (estado) => {
            switch (estado) {
                case "Presente": return "FF4CAF50";
                case "Ausente": return "FFF44336";
                case "Justificado": return "FF03A9F4";
                default: return "FFFFFFFF";
            }
        };
        result.rows.forEach((row, index) => {
            const { nombre, apellido } = separarApellidosYNombres(row.nombre_completo);
            const newRow = worksheet.addRow({
                apellido,
                nombre,
                rut: row.rut,
                correo: row.correo,
                fono: row.fono,
                asistencia: row.estado || "S",
            });
            const fillColor = index % 2 === 0 ? "FFF1F1F1" : "FFFFFFFF";
            newRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });
            const asistenciaCell = newRow.getCell("asistencia");
            asistenciaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorAsistencia(row.estado || "S") } };
            asistenciaCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${nombreCurso}_${fecha}.xlsx`);
        yield workbook.xlsx.write(res);
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Error al generar Excel");
    }
}));
exports.default = router;
