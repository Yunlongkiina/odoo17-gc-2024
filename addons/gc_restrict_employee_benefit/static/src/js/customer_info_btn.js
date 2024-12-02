/** @odoo-module */
    import { usePos } from "@point_of_sale/app/store/pos_hook";
    import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
    import { Component } from "@odoo/owl";
    import { useService } from "@web/core/utils/hooks";
    import { jsonrpc } from "@web/core/network/rpc_service";
    import { _t } from "@web/core/l10n/translation";
    import { ConfirmPopup } from "@point_of_sale/app/utils/confirm_popup/confirm_popup";

   export class CustomDemoButtons extends Component {
    static template = "gc_restrict_employee_benefit.CustomDemoButtons";

    setup() {
        this.pos = usePos();
        this.popup = useService("popup");
    }

       async onClick() {
        var order = this.pos.get_order()
        var current_client = order.get_partner();
           if (current_client) {
               const partner_id = current_client.id;
               const total_amount_of_current_month = await jsonrpc('/totalamount/pos',{ 'partner_id': partner_id });                
               const limited_amount = current_client.limited_amount;
               
            let { confirmed }  =  this.popup.add(ConfirmPopup, {
                   title: _t('Customer Information'),
                   body: _t(`Your credit limit for the month: ${limited_amount},
                       Total spent this month: ${total_amount_of_current_month.total_amount};
                       Your Current Month Credits: ${limited_amount},
                       Already consumed: ${total_amount_of_current_month.total_amount}`),
               });

                if (confirmed) {} else {return;}

           }
       }
   }

   ProductScreen.addControlButton({
       component: CustomDemoButtons,
       position: ["after", "SetFiscalPositionButton"],
       condition: function() {
        return this.pos.config.allow_bag_charges;
        },
   });
