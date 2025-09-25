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
exports.generarBoletaPDF = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const qrcode_1 = __importDefault(require("qrcode"));
function formatearRUT(rut) {
    const [cuerpo, dv] = rut.split("-");
    if (!cuerpo || !dv)
        return rut;
    const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${cuerpoConPuntos}-${dv}`;
}
const generarBoletaPDF = (alumno_1, pago_1, curso_1, ...args_1) => __awaiter(void 0, [alumno_1, pago_1, curso_1, ...args_1], void 0, function* (alumno, pago, curso, opciones = {}) {
    var _a;
    // 🔹 Generar QR dinámico
    const datosQR = {
        num_boleta: pago.num_boleta,
        fecha: pago.fecha.toLocaleDateString("es-CL"),
        monto: pago.monto,
        alumno: alumno.nombre,
        rut: alumno.rut,
    };
    const qrString = JSON.stringify(datosQR);
    const qrDataURL = yield qrcode_1.default.toDataURL(qrString);
    // 🔹 Ruta al logo dentro del repo
    const rutaImagen = path_1.default.join(__dirname, "../assets/cfa.jpeg");
    const imagenBase64 = fs_1.default.readFileSync(rutaImagen, { encoding: "base64" });
    const imgData = `data:image/jpeg;base64,${imagenBase64}`;
    // 🔹 Calcular total
    const total = curso.monto +
        (opciones.incluirMatricula && opciones.montoMatricula
            ? opciones.montoMatricula
            : 0);
    // 🔹 Cargar template HTML
    const rutaTemplate = path_1.default.join(__dirname, "../templates/boletaTemplate.html");
    const templateSource = fs_1.default.readFileSync(rutaTemplate, "utf8");
    // Compilar con Handlebars
    const template = handlebars_1.default.compile(templateSource);
    // Generar HTML dinámico
    const html = template({
        logo: imgData,
        fecha: pago.fecha.toLocaleDateString("es-CL"),
        cliente: {
            rut: formatearRUT(alumno.rut),
            nombre: alumno.nombre,
            correo: alumno.correo,
            fono: alumno.fono,
        },
        curso: {
            codigo: curso.codigo,
            nombre: curso.nombre,
            descripcion: curso.descripcion,
            duracion: curso.duracion,
            monto: curso.monto.toLocaleString(),
        },
        pago: {
            descripcion: pago.descripcion,
        },
        matricula: opciones.incluirMatricula
            ? (_a = opciones.montoMatricula) === null || _a === void 0 ? void 0 : _a.toLocaleString()
            : null,
        total: total.toLocaleString(),
        numBoleta: pago.num_boleta,
        qrCode: qrDataURL,
    });
    // 🔹 Generar PDF con Puppeteer
    const browser = yield puppeteer_1.default.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"], // necesario en Render
    });
    const page = yield browser.newPage();
    yield page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = yield page.pdf({ format: "A4", printBackground: true });
    yield browser.close();
    return pdfBuffer;
});
exports.generarBoletaPDF = generarBoletaPDF;
