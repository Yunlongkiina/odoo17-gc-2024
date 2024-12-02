/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useService } from "@web/core/utils/hooks";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { Order, Orderline, Payment } from "@point_of_sale/app/store/models";
import { _t } from "@web/core/l10n/translation";
import { ProductInfoPopup } from "@point_of_sale/app/screens/product_screen/product_info_popup/product_info_popup";
import { ErrorBarcodePopup } from "@point_of_sale/app/barcode/error_popup/barcode_error_popup";

patch(ProductScreen.prototype, {
    setup() {
        super.setup();
        this.pos=usePos();
    },
    /**
     * For accessibility, pressing <space> should be like clicking the product.
     * <enter> is not considered because it conflicts with the barcode.
     *
     * @param {KeyPressEvent} event
     */
   
   async _barcodeProductAction(code) {
        let check = this.scan_prod_barcode(code.base_code)
        console.log('Here Im checking Multi barcode')
        if(check == false){
            console.log('No Multi barcode')
            super._barcodeProductAction(code);
        }
    },

    async scan_prod_barcode (parsed_code){
        let self = this;
        let selectedOrder = this.pos.get_order();
        let barcode = this.env.services.pos.barcode_by_name[parsed_code];
        if(barcode){
            let products = [];
            if(barcode.product_id){
                let product = this.env.services.pos.db.get_product_by_id(barcode.product_id[0]);
                console.log('Here i find multi barcode and add product')
                if(product){
                    selectedOrder.add_product(product,{quantity:1});
                    return true;
                }else{
                    return true;
                }
            }else{
                return false;
            }
        }else{
            let product_barcode = this.env.services.pos.db.product_by_barcode[parsed_code];
            console.log('Here i cant find multi barcode but find product barcode type is weight')
            console.log(parsed_code)
            console.log(parsed_code.type)
            if (product_barcode){
                let product = this.env.services.pos.db.get_product_by_id(product_barcode.id);
                selectedOrder.add_product(product, {quantity:1});
                return false;
            }else{
                return this.popup.add(ErrorBarcodePopup, { code: parsed_code });
            }
        }
        return false;
    
    },
});