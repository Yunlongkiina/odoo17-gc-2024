/** @odoo-module **/


const {Component, useState, useExternalListener, useEffect, onWillUpdateProps,useRef} = owl;
import {useService} from "@web/core/utils/hooks";

export class SearchBar extends Component {
    setup() {

        this.state = useState({is_visible: false, parts: []})
        this.query = useState({value: ''})
        this.orm = useService("orm");
        useExternalListener(window, "click", this.onWindowClicked);
        // this.ui = useService("ui");
        this.actionService = useService("action");
         this.rootRef = useRef("root");
        // useEffect(
        //     () => {
        //         Promise.resolve().then(() => {
        //             this.myActiveEl = this.ui.activeElement;
        //         });
        //     },
        //     () => []
        // );
        useEffect(
            () => {
                this.sendRequest(this.query.value)
            },
            () => [this.query.value]
        );
    }


    setQuery = async (e) => {

        clearTimeout(this.time_out)
        this.time_out = setTimeout(() => {
            this.query.value = e.target.value
        }, 300);
    }
    sendRequest = async (value) => {
        let parts = await this.orm.searchRead("product.product", ["|", "|", ["name", "ilike", value], ["default_code", "ilike", value], ["barcode", "ilike", value]], ["id", "detailed_type", "display_name", "name", "default_code", "categ_id", "weight", "list_price", "write_date", "uom_id", "tracking"], {limit: 30})
        this.state.parts = parts
    }


    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_128&id=${id}&write_date=${write_date}&unique=1`;
    }

    onFocus() {
        this.state.is_visible = true
    }

    selectProduct = async (part) => {
        this.state.is_visible = false
        await this.props.selectedProductFunction(part)
    }

    onWindowClicked(ev) {
        // Return if already closed
        if (!this.state.is_visible) {
            return;
        }
        // Return if it's a different ui active element
        // if (this.ui.activeElement !== this.myActiveEl) {
        //     return;
        // }
        // Close if we clicked outside the dropdown, or outside the parent
        // element if it is the toggler
        const rootEl = this.rootRef.el;
        const gotClickedInside = rootEl.contains(ev.target);
        if (!gotClickedInside) {
            this.state.is_visible = false
        }
    }
}

export class SearchBar1 extends Component {
    setup() {

        this.state = useState({is_visible: true, parts: []})
        this.query = useState({value: ''})
        this.orm = useService("orm");
        useEffect(
            () => {
                this.sendRequest(this.query.value)
            },
            () => [this.query.value]
        );
    }


    setQuery = async (e) => {

        clearTimeout(this.time_out)
        this.time_out = setTimeout(() => {
            this.query.value = e.target.value
        }, 300);
    }
    sendRequest = async (value) => {
        let parts = await this.orm.searchRead("product.product", ["|", "|", ["name", "ilike", value], ["default_code", "ilike", value], ["barcode", "ilike", value]], ["id", "detailed_type", "display_name", "name", "default_code", "categ_id", "weight", "list_price", "write_date", "uom_id", "tracking"], {limit: 30})
        this.state.parts = parts
    }

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_128&id=${id}&write_date=${write_date}&unique=1`;
    }

    onFocus() {
        // this.state.is_visible = true
    }

    selectProduct = async (part) => {
        this.state.is_visible = false
        await this.props.selectedProductFunction(part)
    }

}

export class WarehouseDetailsTable extends Component {
    setup() {
        this.state = useState({is_expanded: false, is_hide_no_stock: false})
    }

    selectExpandAll = (e) => {
        let change_state = e.target.checked ? this.state.is_expanded = true : this.state.is_expanded = false
    }
    selectHideNoStock = (e) => {
        let change_state = e.target.checked ? this.state.is_hide_no_stock = true : this.state.is_hide_no_stock = false
    }

}

export class CollapsableRow extends Component {
    setup() {
        this.state = useState({is_visible: this.props.is_expanded})
        onWillUpdateProps(async (nextProps) => {
            this.state.is_visible = nextProps.is_expanded
        });
    }


    clickExpand = () => {
        let change_state = this.state.is_visible ? this.state.is_visible = false : this.state.is_visible = true
    }

}

export class AddProductsPopUp extends Component {
    setup() {
        this.state = useState({
            display_value: "1",
            part_details: {},
            part_available: false,
            selected_part: {},
            is_hide_zero: false
        })
        this.digit_value = '0'
        this.orm = useService("orm");
        this.rpcService = useService("rpc");
        this.actionService = useService("action");


    }

    selectProductSearchBar = async (part) => {
        this.state.selected_part = part
        await this.getDataUpdateState([part])
    }

    // this.props.add_product(part)
    selectDot(e) {
        let display_value = this.state.display_value.toString()
        if (display_value[display_value.length - 1] === '.') {

        } else {
            display_value = display_value + '.'
        }
        this.state.display_value = display_value
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

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_512&id=${id}&write_date=${write_date}&unique=1`;
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

    getDataUpdateState = async (scanned_part) => {

        let data = await this.rpcService(`/web/dataset/call_kw/product.product/get_product_info_barcode_app`, {
            model: 'product.product',
            method: 'get_product_info_barcode_app',
            args: [[scanned_part[0].id], 1],
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
        this.state.part_available = true
        this.state.selected_part['virtual_available'] = data.product_data.virtual_available

    }
    confirmAddProduct = () => {
        if (Object.keys(this.state.selected_part).length > 0) {
            this.props.add_product(this.state.selected_part, parseFloat(this.state.display_value))
            this.props.back_button()
        } else {
            console.log("select the product bro")
        }

    }

}

AddProductsPopUp.template = "custom_barcode_app.AddProductsPopUp"
AddProductsPopUp.components = {SearchBar, SearchBar1, WarehouseDetailsTable};
WarehouseDetailsTable.components = {CollapsableRow}
WarehouseDetailsTable.template = "custom_barcode_app.WarehouseDetailsTable"
SearchBar.template = "custom_barcode_app.SearchBar"
SearchBar1.template = "custom_barcode_app.SearchBar1"
CollapsableRow.template = "custom_barcode_app.CollapsableRow"