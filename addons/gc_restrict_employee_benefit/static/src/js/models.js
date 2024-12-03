/** @odoo-module */
import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";

patch(PosStore.prototype, {
     async _processData(loadedData) {
        await super._processData(...arguments);
        this.custom_model = loadedData["res.partner"];
        }
});