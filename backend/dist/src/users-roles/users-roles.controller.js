"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRolesController = void 0;
const common_1 = require("@nestjs/common");
const users_roles_service_1 = require("./users-roles.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
let UsersRolesController = class UsersRolesController {
    constructor(service) {
        this.service = service;
    }
    getStats() {
        return this.service.getStats();
    }
    async getUsersList(page, limit) {
        return this.service.getUsersList(page, limit);
    }
    createUser(body) {
        return this.service.createUser(body);
    }
    toggleStatus(id) {
        return this.service.toggleUserStatus(id);
    }
    updateUser(id, body) {
        return this.service.updateUser(id, body);
    }
    deleteUser(id) {
        return this.service.deleteUser(id);
    }
    getRoles() {
        return this.service.getRoles();
    }
    createRole(body) {
        return this.service.createRole(body);
    }
    getRolePermissions(roleId) {
        return this.service.getRolePermissions(roleId);
    }
    updateRolePermissions(roleId, permissions) {
        return this.service.updateRolePermissions(roleId, permissions);
    }
    getAuditLogs() {
        return this.service.getAuditLogs();
    }
    getAuditList() {
        return this.service.getAuditList();
    }
};
exports.UsersRolesController = UsersRolesController;
__decorate([
    (0, common_1.Get)('summary-metrics'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canView'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('list'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canView'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersRolesController.prototype, "getUsersList", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canAdd'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "createUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canEdit'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canEdit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canDelete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('roles'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canView'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "getRoles", null);
__decorate([
    (0, common_1.Post)('roles'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canAdd'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "createRole", null);
__decorate([
    (0, common_1.Get)('roles/:roleId/permissions'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canView'),
    __param(0, (0, common_1.Param)('roleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "getRolePermissions", null);
__decorate([
    (0, common_1.Post)('roles/:roleId/permissions'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canEdit'),
    __param(0, (0, common_1.Param)('roleId')),
    __param(1, (0, common_1.Body)('permissions')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "updateRolePermissions", null);
__decorate([
    (0, common_1.Get)('audit-summary'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canView'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('audit-list'),
    (0, require_permission_decorator_1.RequirePermission)('Users and Roles', 'canView'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersRolesController.prototype, "getAuditList", null);
exports.UsersRolesController = UsersRolesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('users-roles'),
    __metadata("design:paramtypes", [users_roles_service_1.UsersRolesService])
], UsersRolesController);
//# sourceMappingURL=users-roles.controller.js.map