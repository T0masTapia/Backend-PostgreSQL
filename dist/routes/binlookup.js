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
// routes/binlookup.js
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const router = express_1.default.Router();
router.get("/:bin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { bin } = req.params;
    try {
        const response = yield (0, node_fetch_1.default)(`https://lookup.binlist.net/${bin}`, {
            headers: { "Accept": "application/json" } // 👈 obligatorio
        });
        if (!response.ok) {
            return res.status(response.status).json({ error: "BIN no válido" });
        }
        const data = yield response.json();
        res.json(data); // 🔥 ahora sí tu backend responde bien
    }
    catch (err) {
        console.error("Error consultando BIN:", err);
        res.status(500).json({ error: "Error al consultar el BIN" });
    }
}));
exports.default = router;
