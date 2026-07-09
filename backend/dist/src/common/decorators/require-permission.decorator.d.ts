export declare const REQUIRE_PERMISSION_KEY = "require_permission";
export declare const RequirePermission: (moduleName: string, action: "canView" | "canAdd" | "canEdit" | "canDelete" | "canApprove") => import("@nestjs/common").CustomDecorator<string>;
