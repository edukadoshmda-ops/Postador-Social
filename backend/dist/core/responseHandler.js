"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, message = 'Sucesso', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}
function sendError(res, error = 'Erro interno do servidor', statusCode = 500, details) {
    return res.status(statusCode).json({
        success: false,
        error,
        details,
    });
}
