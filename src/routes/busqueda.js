import express from "express";
import * as busquedaController from "../controllers/busquedaController.js";

const router = express.Router();

//GET /busqueda/aulas?...
//http://localhost:3000/busqueda/aulas?numero=210&ubicacion=Dep2&capacidadMin=10&computadorasMin=0&tieneProyector=true
router.get("/aulas", busquedaController.buscarAulas);

export default router;
