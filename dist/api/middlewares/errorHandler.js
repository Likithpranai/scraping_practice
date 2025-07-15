"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
const errorHandler = (error, req, res, next) => {
    logger_1.default.error('API Error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        params: req.params,
        query: req.query
    });
    const statusCode = error.statusCode || 500;
    const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
    const apiError = {
        success: false,
        error: error.message || 'An unexpected error occurred',
        code: errorCode,
        timestamp: new Date()
    };
    res.status(statusCode).json(apiError);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    const apiError = {
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
        code: 'NOT_FOUND',
        timestamp: new Date()
    };
    res.status(404).json(apiError);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map