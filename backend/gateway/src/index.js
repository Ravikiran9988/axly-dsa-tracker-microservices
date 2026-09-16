"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Security and utility middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json()); // Only needed for endpoints directly handled by gateway, not proxy
// Rate limiting foundation
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Proxy routes (Environment-based service URLs)
// Example of how routing will work. 
// DO NOT import business logic, service databases, or service source code.
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5001';
const PROBLEM_SERVICE_URL = process.env.PROBLEM_SERVICE_URL || 'http://localhost:5002';
app.use('/api/users', (0, http_proxy_middleware_1.createProxyMiddleware)({ target: USER_SERVICE_URL, changeOrigin: true }));
app.use('/api/problems', (0, http_proxy_middleware_1.createProxyMiddleware)({ target: PROBLEM_SERVICE_URL, changeOrigin: true }));
exports.server = app.listen(PORT, () => {
    console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map