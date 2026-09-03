"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const responseHandler_1 = require("./responseHandler");
function errorHandler(err, req, res, next) {
    console.error('Unhandled Error:', err);
    const status = err.status || 500;
    const message = err.message || 'Erro interno do servidor';
    return (0, responseHandler_1.sendError)(res, message, status, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}
