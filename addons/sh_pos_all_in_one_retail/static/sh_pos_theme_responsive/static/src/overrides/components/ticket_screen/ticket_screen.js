/** @odoo-module */

import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

patch(TicketScreen.prototype, {
    setup() {
        super.setup()
        setTimeout(() => {

            var owl = $('.owl-carousel');
            owl.owlCarousel({
                loop: false,
                nav: true,
                margin: 10,
                responsive: {
                    0: {
                        items: 1
                    },
                    600: {
                        items: 3
                    },
                    960: {
                        items: 5
                    },
                    1200: {
                        items: 6
                    }
                }
            });
            owl.on('mousewheel', '.owl-stage', function (e) {
                if (e.originalEvent.wheelDelta > 0) {
                    owl.trigger('next.owl');
                } else {
                    owl.trigger('prev.owl');
                }
                e.preventDefault();
            });
        }, 20);
    },
    onMounted() {
        super.onMounted()        
        if(this && this.pos && this.pos.pos_theme_settings_data && this.pos.pos_theme_settings_data[0] && this.pos.pos_theme_settings_data[0].sh_cart_position && this.pos.pos_theme_settings_data[0].sh_cart_position == 'left_side'){
            $('.leftpane').insertBefore($('.rightpane'));
        }
        if(this && this.pos && this.pos.pos_theme_settings_data && this.pos.pos_theme_settings_data[0] && this.pos.pos_theme_settings_data[0].sh_action_button_position && this.pos.pos_theme_settings_data[0].sh_action_button_position == 'bottom'){
            $('.ticket-screen').addClass('sh_control_button_bottom')
        }else if(this && this.pos && this.pos.pos_theme_settings_data && this.pos.pos_theme_settings_data[0] && this.pos.pos_theme_settings_data[0].sh_action_button_position && this.pos.pos_theme_settings_data[0].sh_action_button_position == 'left_side'){
            $('.ticket-screen').addClass('sh_control_button_left')
        }
        else if(this && this.pos && this.pos.pos_theme_settings_data && this.pos.pos_theme_settings_data[0] && this.pos.pos_theme_settings_data[0].sh_action_button_position && this.pos.pos_theme_settings_data[0].sh_action_button_position == 'right_side'){
            $('.ticket-screen').addClass('sh_control_button_right')
        }
        if(this && this.pos && this.pos.pos_theme_settings_data && this.pos.pos_theme_settings_data[0] && this.pos.pos_theme_settings_data[0].sh_cart_position && this.pos.pos_theme_settings_data[0].sh_action_button_position == 'bottom'){
            $('.ticket-screen').addClass('sh_hide_control_button_screen')
        }
    },
    get isOrderSynced(){
        var res = super.isOrderSynced
        if (this._state.ui.filter == "SYNCED") {            
            $('.ticket-screen').removeClass('sh_hide_control_button_screen')
            $('.sh_action_button').removeClass('sh_hide_action_button')
        }
        return res
    },


    _getSearchFields(){
        const fields = {
            RECEIPT_NUMBER: {
                repr: (order) => order.name,
                displayName: _t("Receipt Number"),
                modelField: "pos_reference",
            },
            DATE: {
                repr: (order) => order.date_order.toFormat("yyyy-MM-dd HH:mm a"),
                displayName: _t("Date"),
                modelField: "date_order",
            },
            PARTNER: {
                repr: (order) => order.get_partner_name(),
                displayName: _t("Customer"),
                modelField: "partner_id.complete_name",
            },
        };        
        return fields;
    },
    _onUpdateSelectedOrderline({ key, buffer }) {
        console.log(`********the buffer of current order is: ${buffer}**************************`);
        
        const order = this.getSelectedOrder();
        if (!order) {
            return this.numberBuffer.reset();
        }

        const selectedOrderlineId = this.getSelectedOrderlineId();
        const orderline = order.orderlines.find((line) => line.id == selectedOrderlineId);
        console.log(orderline);
        console.log('i am selected!');
        
        
        if (!orderline) {
            return this.numberBuffer.reset();
        }

        const toRefundDetails = orderline
            .getAllLinesInCombo()
            .map((line) => this._getToRefundDetail(line));

        for (const toRefundDetail of toRefundDetails) {
            // When already linked to an order, do not modify the to refund quantity.
            if (toRefundDetail.destinationOrderUid) {
                return this.numberBuffer.reset();
            }

            const refundableQty =
                toRefundDetail.orderline.qty - toRefundDetail.orderline.refundedQty;
            if (refundableQty <= 0) {
                return this.numberBuffer.reset();
            }

            if (buffer == null || buffer == "") {
                toRefundDetail.qty = 0;
            } else {
                const quantity = Math.abs(parseFloat(buffer));
                if (quantity > refundableQty) {
                    this.numberBuffer.reset();
                    this.popup.add(ErrorPopup, {
                        title: _t("Maximum Exceeded"),
                        body: _t(
                            "The requested quantity to be refunded is higher than the ordered quantity. %s is requested while only %s can be refunded.",
                            quantity,
                            refundableQty
                        ),
                    });
                } else {
                    toRefundDetail.qty = quantity;
                }
            }
        }
    },
});
