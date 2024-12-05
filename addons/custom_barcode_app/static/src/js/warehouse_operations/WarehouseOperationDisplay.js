/** @odoo-module **/

import {useService, useBus} from "@web/core/utils/hooks";
import {registry} from "@web/core/registry";
const {useState, onWillStart, useExternalListener,useEffect,Component,useRef} = owl;
//import core from 'web.core';
console.log('Javascript File loaded successfully !!');

export class WarehouseOperationDisplay extends Component {


    constructor(...args) {
        super(...args);
    }

    setup() {
        this.state = useState({
            filtered_stock_pickings: [],
            selected_operation: {}

        })
        this.orm = useService("orm");
        this.rpcService = useService("rpc");
        this.actionService = useService("action");
        this.notificationService = useService("notification");
        // [{warehouse:{},operation_types:[{},{}]} , {warehouse:{},operation_types:[{},{}]}]
        this.warehouses_with_operation_types = []
        onWillStart(async () => {
        this.warehouses_with_operation_types = await this.orm.call('warehouse.operation.barcode', 'get_stock_operation_type_data', [[]], {})
        });

    }

    // ["code", "=", "internal"]



    selectOperationType = async (operation) => {
        this.state.selected_operation = operation
        this.state.filtered_stock_pickings = await this.orm.searchRead("stock.picking", [["picking_type_id", "=", operation.id], ["state", "=", this.state.selected_state]], [], {limit: 100})
        this.actionService.doAction(
            {
                name: 'Warehouse Picking Type Operations',
                type: 'ir.actions.client',
                target: '',
                tag: 'warehouse_picking',
                params: {
                    picking_type_id: this.state.selected_operation.id
                }
            }
        )
    }

    backButtonClick() {
//        const barcode = useService("barcode");
//        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.off('barcode_scanned', this, this.scan1);
        console.log('warehouseoperationdisplay.js --> backButtonClick');
//        if (this.env.config.breadcrumbs.length > 0) {
//            this.actionService.restore();
//            this.env.config.historyBack();
//            this.state.view = "mainScreen";
//        }
        this.actionService.doAction(
            {
                name: 'Main Screen',
                type: 'ir.actions.client',
                target: '',
                tag: 'main_screen'
            }
        )
    }
}

export class WarehousePickingDisplay extends Component {


    setup() {
        this.state = useState({
            warehouse_operations_visible: true,
            warehouse_pickings_visible: false,
            selected_state: 'assigned',
            filtered_stock_pickings: [],
            selected_picking: {},

        })
        this.query = useState({value:''})
        this.orm = useService("orm");
        this.rpcService = useService("rpc");
        this.actionService = useService("action");
        this.notificationService = useService("notification");
        // [{warehouse:{},operation_types:[{},{}]} , {warehouse:{},operation_types:[{},{}]}]
                onWillStart(async () => {
                    this.state.filtered_stock_pickings = await this.orm.searchRead("stock.picking", [["picking_type_id", "=", this.props.action.params.picking_type_id], ["state", "=", this.state.selected_state]], [], {limit: 100})

        });

          useEffect(
            () => {
                this.sendRequest(this.query.value)
            },
            () => [this.query.value]
        );
    }


    // ["code", "=", "internal"]

    setQuery = async (e) => {

        clearTimeout(this.time_out)
        this.time_out = setTimeout(() => {
            this.query.value = e.target.value
        }, 300);
    }
    sendRequest = async (value) => {
        let pickings = await this.orm.searchRead("stock.picking", [["picking_type_id", "=", this.props.action.params.picking_type_id],["state", "=", this.state.selected_state],"|","|",["origin", "ilike", value],["partner_id", "ilike", value],["name", "ilike", value]], [], {limit: 30})
        this.state.filtered_stock_pickings = pickings
    }

    selectState = async (state) => {
        this.state.selected_state = state
        this.state.filtered_stock_pickings = await this.orm.searchRead("stock.picking", [["picking_type_id", "=", this.props.action.params.picking_type_id], ["state", "=", this.state.selected_state]], [], {limit: 100})
    }

    selectOperation = async (picking) => {

        this.state.selected_picking = picking
        this.state.warehouse_pickings_visible = false
        this.actionService.doAction(
            {
                name: 'Warehouse Picking Operations',
                type: 'ir.actions.client',
                target: '',
                tag: 'warehouse_picking_operations',
                params: {
                    picking_id: picking.id,
                    picking_type_id: this.props.action.params.picking_type_id
                }
            }
        )
    }
    viewStockPicking = (picking) => {
        this.actionService.doAction(
            {
                name: 'Example',
                type: 'ir.actions.act_window',
                res_model: 'stock.picking',
                target: 'new',
                res_id: picking.id,
                views: [[false, 'form']]
            }
        )

    }


    backButtonClickWarehousePickings = () => {
        if (this.env.config.breadcrumbs.length > 0) {
            this.actionService.restore();

        }

    }
}

export class SelectState extends Component {
    setup() {
        this.state = useState({list_visible: false})
        useExternalListener(window, "click", this.onWindowClicked);
        this.rootRef = useRef("root_select_state");
        // this.ui = useService("ui");
        // useEffect(
        //     () => {
        //         Promise.resolve().then(() => {
        //             this.myActiveEl = this.ui.activeElement;
        //         });
        //     },
        //     () => []
        // );
    }

    handleListClick = (selected_item) => {

        Object.assign(this.state, {list_visible: false})
        this.props.select_state(selected_item)
    }
    clickDropDown = () => {

        if (this.state.list_visible) {
            this.state.list_visible = false
        } else {
            this.state.list_visible = true
        }
    }

    onWindowClicked(ev) {
        // Return if already closed
        if (!this.state.list_visible) {
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
            this.state.list_visible = false
        }
    }


}

WarehouseOperationDisplay.template = "custom_barcode_app.WarehouseOperationDisplay"
WarehousePickingDisplay.components = {SelectState};
WarehousePickingDisplay.template = "custom_barcode_app.WarehousePickingDisplay"
SelectState.template = "custom_barcode_app.SelectState"
registry.category("actions").add('warehouse_operation', WarehouseOperationDisplay);
registry.category("actions").add('warehouse_picking', WarehousePickingDisplay);

