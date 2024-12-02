/** @odoo-module */
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { Component } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";

export class RefundWholeOrderBtn extends Component {
static template = "gc_restrict_employee_benefit.RefundWholeOrderBtn";

setup() {
    this.pos = usePos();
}

   async onClick() {
        console.log('I am clecked RTefund All btn!!!!');
   }
}

ProductScreen.addControlButton({
   component: RefundWholeOrderBtn,
   position: ["after", "RefundButton"],
});
