/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";
// import { producttemplatepopup } from "@bi_pos_product_template/app/products/producttemplatepopup"
// import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
// import { _t } from "@web/core/l10n/translation";
// import { PosCrossSaleProducts } from "@bi_pos_cross_selling/app/product/poscrossproduct";

patch(PosStore.prototype, {

    async _processData(loadedData) {
        await super._processData(loadedData);
        this._loadProductBarcode(loadedData['product.barcode']);
      
        
    },

  _loadProductBarcode(barcodes){
        var self=this;
        self.barcode_by_name={};
        barcodes.forEach(function (barcode){
            self.barcode_by_name[barcode.name] = barcode;
        });
    }
    
});