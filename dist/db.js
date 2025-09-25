"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/db.ts
const pg_1 = __importDefault(require("pg"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { Pool } = pg_1.default;
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
exports.default = pool;
