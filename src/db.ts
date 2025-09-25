// src/db.ts
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necesario para Render
  },
});

// Probar conexión
pool.connect()
  .then(client => {
    console.log("✅ Conexión a PostgreSQL establecida correctamente");
    client.release();
  })
  .catch(err => {
    console.error("❌ Error al conectar a PostgreSQL:", err.message);
  });

export default pool;
