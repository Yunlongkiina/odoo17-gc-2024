/** @odoo-module **/

//import {useService} from "@web/core/utils/hooks";
import {Mutex} from "@web/core/utils/concurrency";

import {Component, useState, onWillUnmount} from "@odoo/owl";
//import core from 'web.core';
import { useBus, useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
console.log('Javascript File loaded successfully !!');


class MainScreen extends Component {


    setup() {
        this.rpcService = useService("rpc");
        this.orm = useService("orm");
        this.actionService = useService("action");
//      Add Back to Home button, depands on Muk Backend Theme
        this.notificationService = useService("notification");
        const barcode = useService("barcode");
        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        this.state = useState({
            view: "mainScreen", // Could be also 'printMenu' or 'editFormView'.
            displayNote: false,
        });
        this.mutex = new Mutex();

//        onWillUnmount(() => {
            //core.bus.off('barcode_scanned', this, this.scan1);
            //useBus(barcode.bus, 'barcode_scanned', this, this.scan1);
//        });
//        onWillUnmount(() => {this.scan1.clear()});
    }


    scan1(barcode) {
        this.mutex.exec(async () => {
            await this.scan(barcode);
        })
    }

    scan = async (barcode) => {
        let data = await this.orm.call("warehouse.operation.barcode", "main_screen_data", [[], barcode], {})
        let product = data.product
        let operation_type = data.operation_type
        let stock_picking = data.stock_picking
        let selected_location = data.selected_location_data

        this.addScannedDetails(product, operation_type, stock_picking, selected_location)
    }
    addScannedDetails = (product, operation_type, stock_picking, selected_location) => {
        if (product.length > 0) {
            this.actionService.doAction(
                {
                    name: 'Product Information',
                    type: 'ir.actions.client',
                    target: '',
                    tag: 'product_information',
                    params: {barcode: product[0]}
                }
            )
        } else if (operation_type.length > 0) {
            this.actionService.doAction(
                {
                    name: 'Create Transfer',
                    type: 'ir.actions.client',
                    target: '',
                    tag: 'create_transfer',
                    params: {picking_type_id: operation_type[0].id, selected_location: false}
                }
            )
        } else if (stock_picking.length > 0) {
            this.actionService.doAction(
                {
                    name: 'Warehouse Picking Operations',
                    type: 'ir.actions.client',
                    target: '',
                    tag: 'warehouse_picking_operations',
                    params: {
                        picking_id: stock_picking[0].picking_id,
                        picking_type_id: stock_picking[0].picking_type_id
                    }
                }
            )
        } else if (selected_location.length > 0) {
            this.actionService.doAction(
                {
                    name: 'Create Transfer',
                    type: 'ir.actions.client',
                    target: '',
                    tag: 'create_transfer',
                    params: {picking_type_id: selected_location[0].id, selected_location: selected_location[0].location}
                }
            )
        } else {
            this.notificationService.add("Error,Barcode not found", {
                title: "Error",
                type: "danger",
            })
            this.onPlaySound('error')
        }
    }


    startCreateTransfer = () => {
        // this.state.create_transfer = true;
        let picking_type_id = false
        this.actionService.doAction(
            {
                name: 'Create Transfer',
                type: 'ir.actions.client',
                target: '',
                tag: 'create_transfer',
                params: {picking_type_id: false, selected_location: false}
            }
        )
    }

    startProductDetails = () => {
        // this.state.product_details_page = true
        this.actionService.doAction(
            {
                name: 'Product Information',
                type: 'ir.actions.client',
                target: '',
                tag: 'product_information',
                params: {barcode: false}
            }
        )

    }

    startWarehouseOperation = () => {
        // this.state.start_warehouse_operation = true
        this.actionService.doAction(
            {
                name: 'Warehouse Operations',
                type: 'ir.actions.client',
                target: '',
                tag: 'warehouse_operation'
            }
        )
    }

    inventoryAdjustment = () => {
        // this.state.inventory_adjustments = true
        this.actionService.doAction(
            {
                name: 'Inventory Adjustments',
                type: 'ir.actions.client',
                target: '',
                tag: 'inventory_adjustments'
            }
        )
        console.log('Inventory Adjustments Clicked')
    }

    test = () => {
        this.actionService.doAction(
            {
                name: 'Example',
                type: 'ir.actions.act_window',
                res_model: 'product.product',
                target: '',
                res_id: 72549,
                views: [[false, 'form']]
            }
        )
    }


    onPlaySound(name) {
        let src;
        if (name === 'error') {
            src = "/custom_barcode_app/static/src/sounds/error.wav";
            let audio = new Audio(src)
            audio.play()

        } else if (name === 'bell') {
            src = "/custom_barcode_app/static/src/sounds/bell.wav";
            let audio = new Audio(src)
            audio.play()
        }

    }


}


MainScreen.template = "custom_barcode_app.MainScreen"
registry.category("actions").add('main_screen', MainScreen);


// function debugOwl(t,e){let n,o="[OWL_DEBUG]";function r(t){let e;try{e=JSON.stringify(t||{})}catch(t){e="<JSON error>"}return e.length>200&&(e=e.slice(0,200)+"..."),e}if(Object.defineProperty(t.Component,"current",{get:()=>n,set(s){n=s;const i=s.constructor.name;if(e.componentBlackList&&e.componentBlackList.test(i))return;if(e.componentWhiteList&&!e.componentWhiteList.test(i))return;let l;Object.defineProperty(n,"__owl__",{get:()=>l,set(n){!function(n,s,i){let l=`${s}<id=${i}>`,c=t=>console.log(`${o} ${l} ${t}`),u=t=>(!e.methodBlackList||!e.methodBlackList.includes(t))&&!(e.methodWhiteList&&!e.methodWhiteList.includes(t));u("constructor")&&c(`constructor, props=${r(n.props)}`);u("willStart")&&t.hooks.onWillStart(()=>{c("willStart")});u("mounted")&&t.hooks.onMounted(()=>{c("mounted")});u("willUpdateProps")&&t.hooks.onWillUpdateProps(t=>{c(`willUpdateProps, nextprops=${r(t)}`)});u("willPatch")&&t.hooks.onWillPatch(()=>{c("willPatch")});u("patched")&&t.hooks.onPatched(()=>{c("patched")});u("willUnmount")&&t.hooks.onWillUnmount(()=>{c("willUnmount")});const d=n.__render.bind(n);n.__render=function(...t){c("rendering template"),d(...t)};const h=n.render.bind(n);n.render=function(...t){const e=n.__owl__;let o="render";return e.isMounted||e.currentFiber||(o+=" (warning: component is not mounted, this render has no effect)"),c(o),h(...t)};const p=n.mount.bind(n);n.mount=function(...t){return c("mount"),p(...t)}}(s,i,(l=n).id)}})}}),e.logScheduler){let e=t.Component.scheduler.start,n=t.Component.scheduler.stop;t.Component.scheduler.start=function(){this.isRunning||console.log(`${o} scheduler: start running tasks queue`),e.call(this)},t.Component.scheduler.stop=function(){this.isRunning&&console.log(`${o} scheduler: stop running tasks queue`),n.call(this)}}if(e.logStore){let e=t.Store.prototype.dispatch;t.Store.prototype.dispatch=function(t,...n){return console.log(`${o} store: action '${t}' dispatched. Payload: '${r(n)}'`),e.call(this,t,...n)}}}
// debugOwl(owl, {
//   // componentBlackList: /App/,  // regexp
//   // componentWhiteList: /SomeComponent/, // regexp
//   // methodBlackList: ["mounted"], // list of method names
//   // methodWhiteList: ["willStart"], // list of method names
//   logScheduler: false,  // display/mute scheduler logs
//   logStore: true,     // display/mute store logs
// });
//
