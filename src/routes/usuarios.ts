import express from "express";
import db from "../db"; // ahora db.ts con pg Pool
import bcrypt from "bcrypt";

const router = express.Router();

// Obtener usuarios (con last_login incluido)
router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT id_usuario, tipo_usuario, correo, last_login
      FROM usuario
    `;
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Crear un usuario administrativo (admi o subAdmi)
router.post("/crear-usuario", async (req, res) => {
  try {
    const { correo, password, tipo_usuario } = req.body;

    if (!correo || !password || !tipo_usuario) {
      return res.status(400).json({ success: false, error: "Faltan datos del usuario" });
    }

    if (!["admi", "subAdmi"].includes(tipo_usuario)) {
      return res.status(400).json({ success: false, error: "Tipo de usuario inválido" });
    }

    // Verificar si ya existe el correo
    const correoCheck = await db.query(
      "SELECT COUNT(*) FROM usuario WHERE correo = $1",
      [correo]
    );
    if (parseInt(correoCheck.rows[0].count) > 0) {
      return res.status(400).json({ success: false, error: "El correo ya está registrado" });
    }

    // Validación: solo un admi
    if (tipo_usuario === "admi") {
      const admiCheck = await db.query(
        "SELECT COUNT(*) FROM usuario WHERE tipo_usuario = 'admi'"
      );
      if (parseInt(admiCheck.rows[0].count) > 0) {
        return res.status(400).json({ success: false, error: "Ya existe un usuario admi" });
      }
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertSql = `
      INSERT INTO usuario (correo, password, tipo_usuario)
      VALUES ($1, $2, $3)
      RETURNING id_usuario
    `;
    const result = await db.query(insertSql, [correo, hashedPassword, tipo_usuario]);
    res.json({
      success: true,
      message: "Usuario creado correctamente",
      id_usuario: result.rows[0].id_usuario,
    });

  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verificar si ya existe un usuario admi
router.get("/check-admi", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*) FROM usuario WHERE tipo_usuario = 'admi'"
    );
    const admiExiste = parseInt(result.rows[0].count) > 0;
    res.json({ success: true, admiExiste });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login con verificación de contraseña y registro de último acceso
router.post("/login", async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ error: "Faltan campos" });

    const sql = `
      SELECT 
        u.*,
        a.nombre_completo,
        a.rut,
        ac.estado AS estado_curso,
        d.estado AS estado_deuda,
        d.fecha_limite
      FROM usuario u
      LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
      LEFT JOIN alumno_curso ac ON ac.rut_alumno = a.rut
      LEFT JOIN deuda d ON d.id_alumno_curso = ac.id
      WHERE u.correo = $1
    `;
    const result = await db.query(sql, [correo]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    // Verificar acceso
    let accesoDenegado = false;
    if (user.estado_curso === "retirado") accesoDenegado = true;
    if (user.estado_deuda === "pendiente" && user.fecha_limite) {
      const fechaActual = new Date();
      const fechaLimite = new Date(user.fecha_limite);
      if (fechaActual > fechaLimite) accesoDenegado = true;
    }
    if (accesoDenegado) {
      return res.status(403).json({ success: false, message: "Acceso denegado. Curso retirado o deuda vencida." });
    }

    // Actualizar último login
    await db.query("UPDATE usuario SET last_login = NOW() WHERE id_usuario = $1", [user.id_usuario]);

    res.json({
      success: true,
      id_usuario: user.id_usuario,
      tipo_usuario: user.tipo_usuario,
      nombre: user.nombre_completo || null,
      rut: user.rut || null,
      last_login: user.last_login,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cambiar contraseña
router.patch("/cambiar-clave/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { nuevaContrasena } = req.body;
    if (!nuevaContrasena) return res.status(400).json({ success: false, error: "Falta la nueva contraseña" });

    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
    const result = await db.query(
      "UPDATE usuario SET password = $1 WHERE id_usuario = $2",
      [hashedPassword, id_usuario]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear un usuario admi (solo uno)
router.post("/crear-admi", async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ success: false, error: "Faltan datos del usuario" });

    const admiCheck = await db.query("SELECT COUNT(*) FROM usuario WHERE tipo_usuario = 'admi'");
    if (parseInt(admiCheck.rows[0].count) > 0) {
      return res.status(400).json({ success: false, error: "Ya existe un usuario admi" });
    }

    const correoCheck = await db.query("SELECT COUNT(*) FROM usuario WHERE correo = $1", [correo]);
    if (parseInt(correoCheck.rows[0].count) > 0) {
      return res.status(400).json({ success: false, error: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertSql = `
      INSERT INTO usuario (correo, password, tipo_usuario)
      VALUES ($1, $2, 'admi')
      RETURNING id_usuario
    `;
    const result = await db.query(insertSql, [correo, hashedPassword]);

    res.json({
      success: true,
      message: "Usuario admi creado correctamente",
      id_usuario: result.rows[0].id_usuario,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener último login de un usuario
router.get("/last-login/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const result = await db.query(
      "SELECT id_usuario, correo, tipo_usuario, last_login FROM usuario WHERE id_usuario = $1",
      [id_usuario]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
