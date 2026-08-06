"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMandiDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_mandi_dto_1 = require("./create-mandi.dto");
class UpdateMandiDto extends (0, mapped_types_1.PartialType)(create_mandi_dto_1.CreateMandiDto) {
}
exports.UpdateMandiDto = UpdateMandiDto;
//# sourceMappingURL=update-mandi.dto.js.map