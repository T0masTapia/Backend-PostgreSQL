"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const usuarios_1 = __importDefault(require("./routes/usuarios"));
const alumnos_1 = __importDefault(require("./routes/alumnos"));
const cursos_1 = __importDefault(require("./routes/cursos"));
const alumnoCurso_1 = __importDefault(require("./routes/alumnoCurso"));
const asistencia_1 = __importDefault(require("./routes/asistencia"));
const deudas_1 = __importDefault(require("./routes/deudas"));
const matricula_1 = __importDefault(require("./routes/matricula"));
const pago_1 = __importDefault(require("./routes/pago"));
const binlookup_1 = __importDefault(require("./routes/binlookup"));
const beca_1 = __importDefault(require("./routes/beca"));
const restablecerPassword_1 = __importDefault(require("./routes/restablecerPassword"));
require("./jobs/recordatorioDeuda");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Usar rutas
app.use('/usuarios', usuarios_1.default);
app.use('/alumnos', alumnos_1.default);
app.use('/cursos', cursos_1.default);
app.use('/alumnoCurso', alumnoCurso_1.default);
app.use('/asistencia', asistencia_1.default);
app.use('/deuda', deudas_1.default);
app.use('/matricula', matricula_1.default);
app.use('/pago', pago_1.default);
app.use('/binlookup', binlookup_1.default);
app.use('/becas', beca_1.default);
app.use('/restablecer-password', restablecerPassword_1.default);
const PORT = process.env.PORT || 3001; // usar puerto de Render si existe
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
