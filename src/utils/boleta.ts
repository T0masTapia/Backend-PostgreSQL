import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import QRCode from "qrcode";

export interface Alumno {
  rut: string;
  nombre: string;
  correo: string;
  fono: string;
}

export interface Pago {
  descripcion: string;
  monto: number;
  fecha: Date;
  num_boleta: number;
}

export interface Curso {
  codigo: string;
  nombre: string;
  descripcion: string;
  duracion: string;
  monto: number;
}

export interface BoletaOpciones {
  incluirMatricula?: boolean;
  montoMatricula?: number;
}

function formatearRUT(rut: string): string {
  const [cuerpo, dv] = rut.split("-");
  if (!cuerpo || !dv) return rut;
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoConPuntos}-${dv}`;
}

export const generarBoletaPDF = async (
  alumno: Alumno,
  pago: Pago,
  curso: Curso,
  opciones: BoletaOpciones = {}
): Promise<Buffer> => {
  // 🔹 Generar QR dinámico
  const datosQR = {
    num_boleta: pago.num_boleta,
    fecha: pago.fecha.toLocaleDateString("es-CL"),
    monto: pago.monto,
    alumno: alumno.nombre,
    rut: alumno.rut,
  };
  const qrString = JSON.stringify(datosQR);
  const qrDataURL = await QRCode.toDataURL(qrString);

  // 🔹 Ruta al logo dentro del repo
  const rutaImagen = path.join(__dirname, "../assets/cfa.jpeg");
  const imagenBase64 = fs.readFileSync(rutaImagen, { encoding: "base64" });
  const imgData = `data:image/jpeg;base64,${imagenBase64}`;

  // 🔹 Calcular total
  const total =
    curso.monto +
    (opciones.incluirMatricula && opciones.montoMatricula
      ? opciones.montoMatricula
      : 0);

  // 🔹 Cargar template HTML
  const rutaTemplate = path.join(__dirname, "../templates/boletaTemplate.html");
  const templateSource = fs.readFileSync(rutaTemplate, "utf8");

  // Compilar con Handlebars
  const template = Handlebars.compile(templateSource);

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
      ? opciones.montoMatricula?.toLocaleString()
      : null,
    total: total.toLocaleString(),
    numBoleta: pago.num_boleta,
    qrCode: qrDataURL,
  });

  // 🔹 Generar PDF con Puppeteer
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // necesario en Render
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  return pdfBuffer as Buffer;
};
