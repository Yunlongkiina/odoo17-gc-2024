/** @odoo-module **/

import {useService, useListener, useBus} from "@web/core/utils/hooks";

const {Component} = owl;
import {Mutex} from "@web/core/utils/concurrency";
//import core from 'web.core';
import { registry } from "@web/core/registry";
console.log('Javascript File loaded successfully !!');

const {useState, useExternalListener, useRef, useEffect, onWillStart, onWillUnmount} = owl;
import {EditPopUpComponent2} from "@custom_barcode_app/js/inventory_transfer_components/EditPopUpComponent";
import {AddProductsPopUp} from "@custom_barcode_app/js/warehouse_operations/AddProductsPopUp";


export class InventoryAdjustments extends Component {
    setup() {
        console.log('Inventory Adjustment Setup Starts')

        this.state = useState({
            // display_parts:[[{id:1,stock_move:move, genuine_stock_move: true ,is_selected:true:,data:{} },{id:1,stock_move:move, genuine_stock_move: true ,data:{}}] , [{stock_move:move ,done_qty:qty },{stock_move:move ,done_qty:qty }]]
            //     source_location:[[{}],[{}]]
            display_parts: [[]],
            current_page: 1,
            total_pages: 1,
            edit_popup: false,
            add_products_popup: false,
            scanning_display: true,
            src_locations: [[]],
            sort_by: 'name',
            groups: {},
            validate_popup: false,
            back_popup: false,
        })
        this.orm = useService("orm");
        this.rpcService = useService("rpc");
        this.actionService = useService("action");
        this.notificationService = useService("notification");
        this.mutex = new Mutex();
        const barcode = useService("barcode");
        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.on('barcode_scanned', this, this.scan1);

        this.display_part_id = 1
        this.edit_popup_part = {}
        this.display_parts_list = [[]]
        this.line_id = 1
        this.internal_src_location_list = []
        this.barcode_line = useRef('barcodeLine')
        this.barcode_line_box = useRef('barcodeLineBox')

        onWillStart(async () => {
            this.state.current_page = 1
            let data = await this.getDataUpdateState()
            console.log(data)
            let display_parts_list = [...data.display_parts]
            if (this.state.sort_by === 'name') {
                for (let i = 0; i < display_parts_list.length; i++) {
                    display_parts_list[i].sort(function (a, b) {
                        let x = a.data.name.toLowerCase();
                        let y = b.data.name.toLowerCase();
                        if (x < y) {
                            return -1;
                        }
                        if (x > y) {
                            return 1;
                        }
                        return 0;
                    });
                }
            }
            this.line_id = data.line_id
            this.internal_src_location_list = data.internal_src_location_list
            this.display_parts_list = [...display_parts_list]
            this.state.src_locations = [...data.src_locations]
            this.state.user_id = data.user_id
            if (data.display_parts.length > 0) {
                this.state.total_pages = data.display_parts.length
            } else {
                this.state.total_pages = 1
            }
            this.state.display_parts = [...data.display_parts]
            this.state.groups = data.groups

        });

        useEffect(
            () => {
                this.getChildrenNodes()
            },
            () => [JSON.stringify(this.state.display_parts[this.state.current_page - 1])]
        );

//        onWillUnmount(() => {
//            useBus(barcode.bus, 'barcode_scanned', this, this.scan1);
            //core.bus.off('barcode_scanned', this, this.scan1);
//        });
    }

    nextPage1 = () => {
        if (this.state.current_page >= 1 && this.state.total_pages >= 1) {
            if (this.state.display_parts.length === this.state.total_pages && this.state.current_page === this.state.total_pages) {
            } else {
                if (this.state.current_page < this.state.total_pages) {
                    this.state.current_page = this.state.current_page + 1
                }
            }
        }
    }

    backPage = () => {
        if (this.state.current_page > 1 && this.state.total_pages > 1) {
            if (this.state.total_pages > this.state.display_parts.length) {
                this.state.current_page = this.state.display_parts.length
                this.state.total_pages = this.state.display_parts.length
            } else if (this.state.current_page > 1) {
                this.state.current_page = this.state.current_page - 1
            }
        }
    }


    scrollTo(element, options = {scrollable: null}) {


        const scrollable = options.scrollable
        if (scrollable) {
            const scrollBottom = scrollable.getBoundingClientRect().bottom;
            const scrollTop = scrollable.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            const elementTop = element.getBoundingClientRect().top;
            if (elementBottom > scrollBottom) {
                // The scroll place the element at the bottom border of the scrollable
                scrollable.scrollTop += elementTop - scrollBottom + element.getBoundingClientRect().height + 300;
            } else if (elementTop < scrollTop) {
                // The scroll place the element at the top of the scrollable
                scrollable.scrollTop -= scrollTop - elementTop;
            }
        }
    }


    scan1(barcode) {
        this.mutex.exec(async () => {
            await this.scan(barcode);
        })
    }

    scan = async (scanned_text) => {
        let split_barcode = scanned_text.split(" ");
        let barcode;
        let quantity;
        if (split_barcode.length === 1) {
            barcode = split_barcode[0]
            quantity = 1
        } else if (split_barcode.length > 1) {
            barcode = split_barcode[0]
            quantity = parseInt(split_barcode[1])
        }


        let location = []
        let scanned_part = await this.orm.searchRead("product.product", [["barcode", "=", barcode]], ["id", "display_name", "name", "weight", "default_code", "tracking"], {limit: 100})
        if (scanned_part.length === 0) {
            location = await this.orm.searchRead("stock.location", [["barcode", "=", barcode]], ["id", "display_name"], {limit: 100})
        }
        if (scanned_part.length > 0) {
            await this.addToDisplayParts(scanned_part, quantity)
        } else if (location.length > 0) {
            await this.selectLocation([location[0].id, location[0].display_name])
        } else if (scanned_part.length <= 0 && location.length <= 0) {
            this.notificationService.add("Barcode does not found", {
                title: "Error",
                type: "danger",
            });
            this.onPlaySound("error")
        }
    }

    getChildrenNodes = () => {
        let current_page = this.state.current_page
        let selected_line_id = [];
        let id;
        if (this.display_parts_list.length > 0) {
            let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
            if (this.barcode_line.el) {
                for (let i = 0; i < display_parts_list_copy.length; i++) {
                    if (display_parts_list_copy[i].is_selected === true) {
                        selected_line_id.push(display_parts_list_copy[i].id)
                    }
                }
                if (selected_line_id.length === 1) {
                    id = "barcode_line_" + selected_line_id[0].toString()
                    for (let i = 0; i < this.barcode_line.el.children.length; i++) {
                        if (this.barcode_line.el.children[i].id === id) {
                            this.scrollTo(this.barcode_line.el.children[i], {scrollable: this.barcode_line_box.el})
                            break
                        }
                    }
                }
            }
        }
    }

    addProduct = async (selected_part, quantity) => {
        await this.addToDisplayParts([selected_part], quantity)
    }

    addToDisplayParts = async (scanned_part, quantity) => {

        let current_page = this.state.current_page
        let indexes_of_scanned_inventory_line = [];


        if (scanned_part[0].tracking === "none") {
            if (this.state.src_locations[current_page - 1].length > 0) {
                if (this.display_parts_list.length > 0) {
                    let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]

                    //create a list of indexes of scanned item inside the stock moves
                    display_parts_list_copy.forEach((inventory_line, index) => {
                        if (scanned_part[0].id === inventory_line.data.product_id) {
                            indexes_of_scanned_inventory_line.push(index)
                        }
                    })

                    if (indexes_of_scanned_inventory_line.length === 1) {

                        display_parts_list_copy = this.closeAllSelectedLines(display_parts_list_copy)
                        let inventory_line = display_parts_list_copy[indexes_of_scanned_inventory_line[0]]
                        inventory_line.data.inventory_quantity += quantity
                        inventory_line.data.inventory_quantity_set = true
                        inventory_line.is_selected = true

                    } else if (indexes_of_scanned_inventory_line.length === 0) {
                        let scanned_part_data = await this.getInventoryAdjustmentDataLocation(scanned_part[0].id, this.state.src_locations[this.state.current_page - 1][0])
                        if (Object.keys(scanned_part_data).length === 0) {

                            display_parts_list_copy = this.closeAllSelectedLines(display_parts_list_copy)
                            display_parts_list_copy.unshift(
                                {
                                    id: this.line_id,
                                    is_selected: true,
                                    genuine_inventory_line: false,
                                    data: {
                                        id: false,
                                        display_name: scanned_part[0].display_name,
                                        product_id: scanned_part[0].id,
                                        name: scanned_part[0].name,
                                        write_date: scanned_part[0].write_date,
                                        default_code: scanned_part[0].default_code,
                                        weight: scanned_part[0].weight,
                                        user_id: this.state.user_id,
                                        inventory_quantity_set: true,
                                        inventory_quantity: quantity,
                                        quantity: 0,
                                        inventory_diff_quantity: 0
                                    }
                                }
                            )
                            this.line_id++

                        } else if (Object.keys(scanned_part_data).length === 1) {

                            display_parts_list_copy = this.closeAllSelectedLines(display_parts_list_copy)
                            scanned_part_data.display_parts.id = this.line_id
                            scanned_part_data.display_parts.data.inventory_quantity += quantity
                            scanned_part_data.display_parts.data.inventory_quantity_set = true
                            scanned_part_data.display_parts.is_selected = true
                            display_parts_list_copy.unshift(scanned_part_data.display_parts)
                            this.line_id++
                        }

                    } else if (indexes_of_scanned_inventory_line.length > 1) {
                        this.notificationService.add("Error Please refresh th page!", {
                            title: "Error",
                            type: "danger",
                        });
                        this.onPlaySound("error")
                    }
                    this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
                    this.state.display_parts[current_page - 1] = [...display_parts_list_copy]

                }

            } else if (this.state.src_locations[current_page - 1].length === 0) {
                this.notificationService.add("Scan the source location or select the location!", {
                    title: "Error",
                    type: "danger",
                });
                this.onPlaySound("error")
            }
        } else {
            this.notificationService.add("Sorry you cannot edit inventory with tracking", {
                title: "Error",
                type: "danger",
            });
            this.onPlaySound("error")
        }
    }


    // warehoue=[id,name] child_location=[id,name]
    selectLocation = (location) => {

        let display_parts_copy_full = [...this.display_parts_list]
        let src_locations = [...this.state.src_locations]
        let current_page = this.state.current_page
        let total_pages = this.state.total_pages

        if (display_parts_copy_full.length > 0) {
            if (display_parts_copy_full[display_parts_copy_full.length - 1].length > 0) {
                let scanned_location_index = []
                src_locations.forEach((src_location, index) => {
                    if (src_location[0] === location[0]) {
                        scanned_location_index.push(index)
                    }
                })

                if (scanned_location_index.length === 0) {
                    src_locations.push(location)
                    display_parts_copy_full.push([])

                    if (current_page >= 1 && total_pages >= 1) {
                        current_page = display_parts_copy_full.length
                        total_pages = total_pages + 1
                    }

                } else if (scanned_location_index.length !== 0) {
                    current_page = scanned_location_index[0] + 1
                }
            } else if (display_parts_copy_full[display_parts_copy_full.length - 1].length === 0) {
                // need to check this undefined
                let scanned_location_index = []
                src_locations.forEach((src_location, index) => {
                    if (src_location[0] === location[0]) {
                        scanned_location_index.push(index)
                    }
                })

                if (scanned_location_index.length === 0) {
                    src_locations[src_locations.length - 1] = location
                    current_page = display_parts_copy_full.length

                } else if (scanned_location_index.length !== 0) {

                    if (src_locations[src_locations.length - 1][0] === location[0]) {

                    } else {
                        src_locations.pop()
                        display_parts_copy_full.pop()
                        total_pages = total_pages - 1
                    }
                    current_page = scanned_location_index[0] + 1

                }

            }
        }
        this.state.src_locations = src_locations
        this.state.current_page = current_page
        this.state.total_pages = total_pages
        this.display_parts_list = [...display_parts_copy_full]
        this.state.display_parts = [...display_parts_copy_full]
    }

    changeIsSelect = (inventory_line) => {

        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]

        for (let i = 0; i < display_parts_list_copy.length; i++) {
            if (display_parts_list_copy[i].id === inventory_line.id) {
                display_parts_list_copy[i].is_selected = true
            } else {
                display_parts_list_copy[i].is_selected = false
            }
        }

        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]
    }

    closeAllSelectedLines = (display_parts_list_copy) => {
        let selected_line_index = [];
        for (let i = 0; i < display_parts_list_copy.length; i++) {
            if (display_parts_list_copy[i].is_selected === true) {
                selected_line_index.push(i)
            }
        }
        if (selected_line_index.length > 0) {
            display_parts_list_copy[selected_line_index[0]].is_selected = false
        }
        return display_parts_list_copy
    }

    handleClickPlus = (inventory_line) => {
        // e.stopPropagation();
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })

        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {

            display_parts_list_copy[selected_inventory_line_id_index].data.inventory_quantity += 1
            display_parts_list_copy[selected_inventory_line_id_index].data.inventory_quantity_set = true

        }
        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]

    }

    handleClickTotalQuantity = (inventory_line) => {
        // e.stopPropagation();
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]

        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })
        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {

            display_parts_list_copy[selected_inventory_line_id_index].data.inventory_quantity += inventory_line.data.quantity - inventory_line.data.inventory_quantity
            display_parts_list_copy[selected_inventory_line_id_index].data.inventory_quantity_set = true

        }
        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]


    }
    handleClickMinus = (inventory_line) => {
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })
        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {
            if (display_parts_list_copy[selected_inventory_line_id_index].data.inventory_quantity > 0) {
                display_parts_list_copy[selected_inventory_line_id_index].data.inventory_quantity -= 1
                display_parts_list_copy[selected_inventory_line_id_index].data.inventory_quantity_set = true
            }
        }
        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]


    }
    editInventoryQuantitySet = (inventory_line) => {
        console.log(inventory_line)
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })
        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {

            inventory_line.data.inventory_quantity_set = (inventory_line.data.inventory_quantity_set) ? inventory_line.data.inventory_quantity_set = false : inventory_line.data.inventory_quantity_set = true
        }
        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]

    }

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_128&id=${id}&write_date=${write_date}&unique=1`;
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

    selectSortBy = async (sort_by) => {

        let display_parts_list = [...this.display_parts_list]
        if (sort_by === 'name') {
            for (let i = 0; i < display_parts_list.length; i++) {
                display_parts_list[i].sort(function (a, b) {
                    let x = a.data.name.toLowerCase();
                    let y = b.data.name.toLowerCase();
                    if (x < y) {
                        return -1;
                    }
                    if (x > y) {
                        return 1;
                    }
                    return 0;
                });
            }

        }
        if (sort_by === 'internal_reference') {
            for (let i = 0; i < display_parts_list.length; i++) {
                display_parts_list[i].sort(function (a, b) {
                    if (a.data.default_code && b.data.default_code) {
                        let x = a.data.default_code.toLowerCase();
                        let y = b.data.default_code.toLowerCase();
                        if (x < y) {
                            return -1;
                        }
                        if (x > y) {
                            return 1;
                        }
                        return 0;
                    }
                });
            }

        }
        if (sort_by === 'quantity') {
            for (let i = 0; i < display_parts_list.length; i++) {
                display_parts_list[i].sort(function (a, b) {
                    return a.data.quantity - b.data.quantity
                });
            }

        }
        if (sort_by === 'weight') {
            for (let i = 0; i < display_parts_list.length; i++) {
                display_parts_list[i].sort(function (a, b) {
                    return a.data.weight - b.data.weight
                });
            }

        }
        if (sort_by === 'order') {
            display_parts_list = [...this.display_parts_list]

        }

        this.display_parts_list = [...display_parts_list]
        this.state.display_parts = [...display_parts_list]
        this.state.sort_by = sort_by

    }

    editPopup = async (inventory_line) => {
        console.log(inventory_line)
        this.edit_popup_part = inventory_line
        Object.assign(this.state, {add_products_popup: false, edit_popup: true, scanning_display: false})


    }
    backButtonEditPopUp = () => {
        this.state.edit_popup = false
        this.state.scanning_display = true
        this.add_products_popup = false
    }
    editPopUpConfirmButton = (display_value) => {
        this.confirmChange(this.edit_popup_part, display_value)
    }


    confirmChange = (inventory_line, scanned_amount) => {
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let selected_inventory_line_id_index;

        display_parts_list_copy.forEach((inventory_line_display_part, index) => {
            // inventory_line_ids.push(inventory_line.id)

            if (inventory_line_display_part.id === inventory_line.id) {
                selected_inventory_line_id_index = index

            }
        })

        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {

            inventory_line.data.inventory_quantity = parseInt(scanned_amount)
            inventory_line.data.inventory_quantity_set = true
        }

        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]
        Object.assign(this.state, {add_products_popup: false, edit_popup: false, scanning_display: true})
    }

    validateTransferPrepareLines = async () => {
        let display_parts_complex = this.state.display_parts

        let prepared_inventory_lines = []
        for (let i = 0; i < display_parts_complex.length; i++) {
            let display_parts = display_parts_complex[i]
            let src_location = this.state.src_locations[i]

            display_parts.forEach((inventory_line) => {
                prepared_inventory_lines.push({src_location: src_location[0], inventory_line: inventory_line})

            })
        }
        let ids = await this.saveBarcodeData(prepared_inventory_lines)
        return ids
    }
    applyValidateTransfer = async () => {
        let ids = await this.validateTransferPrepareLines()
        if (this.state.groups.group_stock_manager) {
            await this.validateApply(ids)
        }
        this.backButton()

    }
    applyTransfer = async () => {
        let ids = await this.validateTransferPrepareLines()
        this.backButton()
    }

    validateApply = async (ids) => {
        if (ids.length > 0) {
            await this.applyInventory(ids)
        }
    }
    validatePopUp = () => {
        Object.assign(this.state, {validate_popup: true})
    }
    discardValidatePopUp = () => {
        Object.assign(this.state, {validate_popup: false})

    }
    backButtonPopUp = () => {
        Object.assign(this.state, {back_popup: true})
    }

    discardBackPopup = () => {
        Object.assign(this.state, {back_popup: false})

    }


    addProductPopup = () => {
        Object.assign(this.state, {add_products_popup: true, edit_popup: false, scanning_display: false})
    }
    backButtonAddProductPopup = () => {
        Object.assign(this.state, {add_products_popup: false, edit_popup: false, scanning_display: true})
    }

    backButton = () => {
//        const barcode = useService("barcode");
//        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.off('barcode_scanned', this, this.scan1);
        Object.assign(this.state, {back_popup: false})
        this.actionService.restore();

    }
    getDataUpdateState = async () => {

        let data = await this.rpcService(`/web/dataset/call_kw/stock.quant.line.prepare/get_inventory_adjustment_lines`, {
            model: 'stock.quant.line.prepare',
            method: 'get_inventory_adjustment_lines',
            args: [[]],
            kwargs: {}
            //context: {},
        });

        return data
    }
    getInventoryAdjustmentDataLocation = async (product_id, location_id) => {
        let data = await this.rpcService(`/web/dataset/call_kw/stock.quant.line.prepare/get_inventory_adjustment_data_location`, {
            model: 'stock.quant.line.prepare',
            method: 'get_inventory_adjustment_data_location',
            args: [[], product_id, location_id],
            kwargs: {}
            //context: {},
        });
        return data
    }

    applyInventory = async (ids) => {
        let data = await this.rpcService(`/web/dataset/call_kw/stock.quant/action_apply_inventory`, {
            model: 'stock.quant',
            method: 'action_apply_inventory',
            args: [ids],
            kwargs: {}
            //context: {},
        });
        return data
    }
    saveBarcodeData = async (prepared_inventory_lines) => {

        let ids = await this.rpcService(`/web/dataset/call_kw/stock.quant/save_barcode_data`, {
            model: 'stock.quant',
            method: 'save_barcode_data',
            args: [[], prepared_inventory_lines],
            kwargs: {}
            //context: {},
        });

        return ids
    }

}

export class BarcodeLine extends Component {

    setup() {
    }


    buttonPanelClicked(ev) {
        ev.stopPropagation()
    }

}

export class BarcodeLineButtonSetInventory extends Component {

    constructor() {
        super(...arguments);
        useListener('click', this.onClickedButton);
    }

    onClickedButton = (ev) => {
        // this.props.edit_inventory_quantity_set()
        ev.stopPropagation()
    }
}

export class BarcodeLineButtonInventoryEdit extends Component {

    constructor() {
        super(...arguments);
        // useListener('click', this.onClickedButton);
    }

    onClickedButton = (ev) => {
        // this.props.edit_popup()
        // console.log(ev)
        // ev.stopPropagation()
    }
}


export class LocationDropDown extends Component {


    setup() {
        this.state = useState({list_visible: false})
        useExternalListener(window, "click", this.onWindowClicked);
        this.rootRef = useRef("root_location_drop_down");
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

    handleListClick = (child_location) => {

        Object.assign(this.state, {list_visible: false})
        // console.log(warehouse)
        console.log(child_location)
        this.props.select_action(child_location)
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

export class SortByInventoryAdjustment extends Component {
    setup() {
        this.state = useState({list_visible: false})
        useExternalListener(window, "click", this.onWindowClicked);
        this.rootRef = useRef("root_sort_inventory");
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
        this.props.select_sort_by(selected_item)
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

LocationDropDown.template = "custom_barcode_app.LocationDropDown"
InventoryAdjustments.template = "custom_barcode_app.InventoryAdjustments"
BarcodeLine.template = "custom_barcode_app.BarcodeLine"
SortByInventoryAdjustment.template = "custom_barcode_app.SortByInventoryAdjustment"
BarcodeLineButtonSetInventory.template = "custom_barcode_app.BarcodeLineButtonSetInventory"
BarcodeLineButtonInventoryEdit.template = "custom_barcode_app.BarcodeLineButtonInventoryEdit"
BarcodeLine.components = {
    BarcodeLineButtonSetInventory,
    BarcodeLineButtonInventoryEdit
}
InventoryAdjustments.components = {
    EditPopUpComponent2,
    AddProductsPopUp,
    LocationDropDown,
    BarcodeLine,
    SortByInventoryAdjustment,
};
registry.category("actions").add('inventory_adjustments', InventoryAdjustments);