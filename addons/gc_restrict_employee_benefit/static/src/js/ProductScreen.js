/** @odoo-module */
import { Order, Orderline, Payment } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
// import { usePos } from "@point_of_sale/app/store/pos_hook";
// import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
// import { markRaw, reactive } from "@odoo/owl";
import { jsonrpc } from "@web/core/network/rpc_service";

patch(Order.prototype, {

    setup() {
        super.setup(...arguments);
    },
    async pay() {
		var self = this;
		let call_super = true;
		let currentOrder = this.env.services.pos.get_order();
        var current_client = currentOrder.get_partner();
		const pricelistId = currentOrder.pricelist.id

		let pos_config = self.env.services.pos.config;
		let goldencrop_employee_pricelist = pos_config.goldencrop_employee_pricelist
		var total_amount = currentOrder.get_total_with_tax()
		
		let limited_amount = current_client? current_client.limited_amount:false;

		if(limited_amount && limited_amount > 0 && goldencrop_employee_pricelist &&  goldencrop_employee_pricelist.includes(pricelistId)){
			const partner_id = current_client.id
			// if employee pricelist and employee limited_amount is set 
			// if(current_client.hasOwnProperty('limited_amount') && goldencrop_employee_pricelist){
				// if  employee limited_amount is not negative and employee pricelist is applied
				// if(current_client.limited_amount > 0 && goldencrop_employee_pricelist.includes(pricelistId)){
					// limited_amount = this.env.pos.attributes.selectedClient.limited_amount;
					const total_amount_of_current_month = await jsonrpc('/totalamount/pos',{ 'partner_id': partner_id });
					const odoo15ce_amount = await jsonrpc('/totalamount/pos',{ 'partner_id': partner_id });

					if(total_amount_of_current_month){
						if((total_amount_of_current_month.total_amount + total_amount) > limited_amount){
							call_super = false;
							this.env.services.pos.popup.add(ErrorPopup, {
								title: _t('!!!!!!!!!!!!!!!!Dangours Order!!!!!!!!!!!!!!!!'),
								body: _t(`不好意思，已经超出您本月额度${limited_amount}，
									已经消费了${total_amount_of_current_month.total_amount}
									不能享受员工折扣了,为了正常付款，请选择普通员工价格表;
									Soryy Your Current Month Credits ${limited_amount}
									You already consumed ${total_amount_of_current_month.total_amount}
									is running out! To validate order successfully, 
									please select normal customer pricelist`),
							});
			
						}
					}
				// }
			// }
		}

		if(call_super){
			super.pay();
		}


	},

});