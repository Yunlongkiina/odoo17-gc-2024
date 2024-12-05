/** @odoo-module **/


const {Component, onWillStart, useState, useEffect} = owl;
import {WarehouseDetailsTable} from "@custom_barcode_app/js/warehouse_operations/AddProductsPopUp";
import {useService} from "@web/core/utils/hooks";

export class EditPopUpComponent extends Component {

    setup() {

        this.rpcService = useService("rpc");
        this.state = useState({display_value: this.props.edit_popup_part.quantity.toString(), part_details: {}})
        onWillStart(async () => {
            await this.getDataUpdateState(this.props.edit_popup_part.product_id)
        });

    }

    // async willStart() {
    //     await this.getDataUpdateState(this.props.edit_popup_part.product_id)
    // }

    digitValue(e) {

        let digit_value = e.target.value
        let display_value = this.state.display_value

        if (display_value === '0') {
            if (digit_value === '0') {
                display_value = '0'
            } else {
                display_value = digit_value
            }
        } else {
            display_value = display_value + digit_value
        }
        this.state.display_value = display_value
    }


    clearLastDigit(e) {
        let display_value = '0'
        if (this.state.display_value.length <= 1) {
            display_value = '0'
        } else {
            display_value = this.state.display_value.substring(0, this.state.display_value.length - 1);
        }
        this.state.display_value = display_value
    }

    plusOne() {

        let display_value = parseFloat(this.state.display_value) + 1
        this.state.display_value = display_value.toString()
    }

    minusOne() {
        if (parseFloat(this.state.display_value) > 0) {
            let display_value = parseFloat(this.state.display_value) - 1
            this.state.display_value = display_value.toString()
        }
    }

    selectDot(e) {
        let display_value = this.state.display_value.toString()
        if (display_value[display_value.length - 1] === '.') {

        } else {
            display_value = display_value + '.'
        }
        this.state.display_value = display_value
    }

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_512&id=${id}&write_date=${write_date}&unique=1`;
    }


    getDataUpdateState = async (part_id) => {

        let data = await this.rpcService(`/web/dataset/call_kw/product.product/get_product_info_barcode_app`, {
            model: 'product.product',
            method: 'get_product_info_barcode_app',
            args: [[part_id], 1],
            kwargs: {}
            //context: {},
        });

        let product_data = {
            product_details: [data.product_data],
            warehouses: data.warehouses,
            pos_stock_list: data.pos_stock_list,
            warehouse_list_without_zero_stock: data.warehouse_list_without_zero_stock,
            suppliers: data.suppliers,
            variants: data.variants,
            price_lists: data.price_list,
            user_id: data.user_id,
            company_id: data.company_id,
            currency_data: data.currency_data,
        }
        this.state.part_details = product_data
    }
}

export class EditPopUpComponent1 extends Component {

    setup() {

        this.rpcService = useService("rpc");
        this.state = useState({display_value: this.props.edit_popup_part.qty_done.toString(), part_details: {}})
        onWillStart(async () => {
            await this.getDataUpdateState(this.props.edit_popup_part.product_id)
        });



    }


    digitValue(e) {

        let digit_value = e.target.value
        let display_value = this.state.display_value

        if (display_value === '0') {
            if (digit_value === '0') {
                display_value = '0'
            } else {
                display_value = digit_value
            }
        } else {
            display_value = display_value + digit_value
        }
        this.state.display_value = display_value
    }


    clearLastDigit(e) {
        let display_value = '0'
        if (this.state.display_value.length <= 1) {
            display_value = '0'
        } else {
            display_value = this.state.display_value.substring(0, this.state.display_value.length - 1);
        }
        this.state.display_value = display_value
    }

    plusOne() {

        let display_value = parseFloat(this.state.display_value) + 1
        this.state.display_value = display_value.toString()
    }

    minusOne() {
        if (parseFloat(this.state.display_value) > 0) {
            let display_value = parseFloat(this.state.display_value) - 1
            this.state.display_value = display_value.toString()
        }
    }

    selectDot(e) {
        let display_value = this.state.display_value.toString()
        if (display_value[display_value.length - 1] === '.') {

        } else {
            display_value = display_value + '.'
        }
        this.state.display_value = display_value
    }

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_512&id=${id}&write_date=${write_date}&unique=1`;
    }


    getDataUpdateState = async (part_id) => {

        let data = await this.rpcService(`/web/dataset/call_kw/product.product/get_product_info_barcode_app`, {
            model: 'product.product',
            method: 'get_product_info_barcode_app',
            args: [[part_id], 1],
            kwargs: {}
            //context: {},
        });

        let product_data = {
            product_details: [data.product_data],
            warehouses: data.warehouses,
            pos_stock_list: data.pos_stock_list,
            warehouse_list_without_zero_stock: data.warehouse_list_without_zero_stock,
            suppliers: data.suppliers,
            variants: data.variants,
            price_lists: data.price_list,
            user_id: data.user_id,
            company_id: data.company_id,
            currency_data: data.currency_data,
        }
        this.state.part_details = product_data
    }
}

export class EditPopUpComponent2 extends Component {
    setup() {

        this.rpcService = useService("rpc");
        this.state = useState({
            display_value: this.props.edit_popup_part.inventory_quantity.toString(),
            part_details: {}
        })
        onWillStart(async () => {
            await this.getDataUpdateState(this.props.edit_popup_part.product_id)
        });
    }


    digitValue(e) {

        let digit_value = e.target.value
        let display_value = this.state.display_value

        if (display_value === '0') {
            if (digit_value === '0') {
                display_value = '0'
            } else {
                display_value = digit_value
            }
        } else {
            display_value = display_value + digit_value
        }
        this.state.display_value = display_value
    }

    clearLastDigit(e) {
        let display_value = '0'
        if (this.state.display_value.length <= 1) {
            display_value = '0'
        } else {
            display_value = this.state.display_value.substring(0, this.state.display_value.length - 1);
        }
        this.state.display_value = display_value
    }

    plusOne() {

        let display_value = parseFloat(this.state.display_value) + 1
        this.state.display_value = display_value.toString()
    }

    minusOne() {
        if (parseFloat(this.state.display_value) > 0) {
            let display_value = parseFloat(this.state.display_value) - 1
            this.state.display_value = display_value.toString()
        }
    }

    selectDot(e) {
        let display_value = this.state.display_value.toString()
        if (display_value[display_value.length - 1] === '.') {

        } else {
            display_value = display_value + '.'
        }
        this.state.display_value = display_value
    }

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_512&id=${id}&write_date=${write_date}&unique=1`;
    }


    getDataUpdateState = async (part_id) => {

        let data = await this.rpcService(`/web/dataset/call_kw/product.product/get_product_info_barcode_app`, {
            model: 'product.product',
            method: 'get_product_info_barcode_app',
            args: [[part_id], 1],
            kwargs: {}
            //context: {},
        });
        console.log(data)

        let product_data = {
            product_details: [data.product_data],
            warehouses: data.warehouses,
            pos_stock_list: data.pos_stock_list,
            warehouse_list_without_zero_stock: data.warehouse_list_without_zero_stock,
            suppliers: data.suppliers,
            variants: data.variants,
            price_lists: data.price_list,
            user_id: data.user_id,
            company_id: data.company_id,
            currency_data: data.currency_data,
        }
        this.state.part_details = product_data
    }

}


EditPopUpComponent1.template = "custom_barcode_app.EditPopUpComponent"
EditPopUpComponent1.components = {WarehouseDetailsTable};
EditPopUpComponent.template = "custom_barcode_app.EditPopUpComponent"
EditPopUpComponent.components = {WarehouseDetailsTable};
EditPopUpComponent2.template = "custom_barcode_app.EditPopUpComponent"
EditPopUpComponent2.components = {WarehouseDetailsTable};