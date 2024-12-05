/** @odoo-module **/

import {useService, useBus} from "@web/core/utils/hooks";

const {Component, onWillStart, useState, useRef, onWillUnmount, useEffect} = owl;
import {Mutex} from "@web/core/utils/concurrency";
//import core from 'web.core';
import { registry } from "@web/core/registry";
console.log('Javascript File loaded successfully !!');
import {SelectDropDown} from "@custom_barcode_app/js/basic_components/SelectDropDown";
import {SelectDropDownLocation} from "@custom_barcode_app/js/basic_components/SelectDropDownLocation";
import {EditPopUpComponent1} from "@custom_barcode_app/js/inventory_transfer_components/EditPopUpComponent";
import {AddProductsPopUp} from "@custom_barcode_app/js/warehouse_operations/AddProductsPopUp";
import {
    SelectDropDownLocationSrc,
    SelectDropDownLocationDest
} from "@custom_barcode_app/js/basic_components/SelectDropDownLocation";
import {SelectAddDropDownLocation} from "@custom_barcode_app/js/basic_components/SelectDropDown"


export class WarehouseOperation extends Component {
    setup() {

        this.state = useState({
            // display_parts:[[{id:1,stock_move:move, genuine_stock_move: true ,data:{} },{id:1,stock_move:move, genuine_stock_move: true ,data:{}}] , [{stock_move:move ,done_qty:qty },{stock_move:move ,done_qty:qty }]]
            //     source_location:[[{}],[{}]]
            display_parts: [],
            current_page: 1,
            total_pages: 1,
            edit_popup: false,
            add_products_popup: false,
            scanning_display: true,
            src_locations: [],
            dest_locations: [],
            edit_popup_part_details: [],
            validate_popup: false,
            back_popup: false,
            add_location_popup: false,
            go_back_screen: false
        })
        this.locations = useState({
            locations_list: [],
            location: [],

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
        // [{warehouse:{},operation_types:[{},{}]} , {warehouse:{},operation_types:[{},{}]}]
        this.warehouses_with_operation_types = []
        this.display_parts_list = []
        this.line_id = 1
        this.scanned_order_ids = []
        this.barcode_line = useRef('barcodeLine')
        this.barcode_line_box = useRef('barcodeLineBox')
        this.picking = {}

        onWillStart(async () => {
            this.state.current_page = 1

            if (this.props.action.params.picking_id && this.props.action.params.picking_type_id) {
                let data = await this.orm.call('warehouse.operation.barcode', 'get_stock_move_lines', [[], this.props.action.params.picking_id, this.props.action.params.picking_type_id], {})
                this.display_parts_list = [...data.display_parts]
                this.state.src_locations = data.src_line_locations
                this.state.dest_locations = data.dest_line_locations
                this.child_src_locations = data.child_src_locations
                this.child_dest_locations = data.child_dest_locations
                this.picking_dest_location = data.picking_dest_location
                this.picking_src_location = data.picking_src_location
                this.operation_type = data.operation_type
                this.picking = data.picking

                if (data.display_parts.length > 0) {
                    this.state.total_pages = data.display_parts.length
                } else {
                    this.state.total_pages = 1
                }

                let display_parts_state = []
                for (let i = 0; i < this.display_parts_list.length; i++) {
                    let list1 = []
                    let list2 = []
                    let list3 = []
                    this.display_parts_list[i].forEach((part) => {
                        if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                            list1.push(part)
                        } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                            list2.push(part)
                        } else if (!part.genuine_stock_move) {
                            list3.push(part)
                        } else {
                        }
                    })
                    let display_parts_array = list1.concat(list3, list2)
                    display_parts_state.push(display_parts_array)
                }

                // this.selectScannedLocation([])

                this.state.display_parts = [...display_parts_state]
                this.line_id = data.line_id
                console.log("Here I start to show display parts")
                console.log(this.display_parts_list)
            }

        });
//        onWillUnmount(() => {
//            useBus(barcode.bus, 'barcode_scanned', this, this.scan1);
            //core.bus.off('barcode_scanned', this, this.scan1);
//        });

        useEffect(
            () => {
                this.getChildrenNodes()
            },
            () => [JSON.stringify(this.state.display_parts[this.state.current_page - 1])]
        );
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
    selectchange = (ev) => {
        this.scan1(ev.target.value)

    }


    scan1(barcode) {
        this.mutex.exec(async () => {
            await this.scan(barcode);
        })
    }

    scan = async (barcode) => {
        let scanned_part = await this.orm.searchRead("product.product", [["barcode", "=", barcode]], ["display_name", "id", "tracking"])
        // this.getDataUpdateState(barcode)
        if (scanned_part.length === 1) {
            this.addToDisplayParts(scanned_part, 1)

        } else {
            let scanned_location = await this.orm.searchRead("stock.location", [["barcode", "=", barcode]], [])
            if (scanned_location.length > 0) {
                this.selectScannedLocation([scanned_location[0].id, scanned_location[0].display_name, false])
            } else {
                this.notificationService.add("Barcode does not found", {
                    title: "Error",
                    type: "danger",
                });
                this.onPlaySound("error")
            }
        }

    }

    changeIsSelect = (inventory_line) => {

        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let display_parts_state = [...this.state.display_parts[current_page - 1]]

        for (let i = 0; i < display_parts_list_copy.length; i++) {
            if (display_parts_list_copy[i].id === inventory_line.id) {
                display_parts_list_copy[i].is_selected = true
            } else {
                display_parts_list_copy[i].is_selected = false
            }
        }
        for (let i = 0; i < display_parts_state.length; i++) {
            if (display_parts_state[i].id === inventory_line.id) {
                display_parts_state[i].is_selected = true
            } else {
                display_parts_state[i].is_selected = false
            }
        }

        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_state]
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

    array_includes = function (array_parent, array) {
        for (var i = 0; i < array_parent.length; i++) {
            if (array_parent[i][0] === array[0] && array_parent[i][1] === array[1]) {
                return true
            }
        }
        return false;
    }
    array_equals = function (array1, array2) {
        let is_equal = false
        for (var i = 0; i < array1.length; i++) {
            if (array1[i] === array2[i]) {
                is_equal = true
            } else {
                return false
            }
        }
        return is_equal
    }
    selectAddLocation = (selected_location) => {
        this.selectScannedLocation([selected_location.id, selected_location.display_name])
        this.locations.location = [selected_location]
        this.backLocationPopup()
    }

    selectSrcLocation = (location) => {
        let selected_operation_type = [this.operation_type]
        let display_parts = [...this.display_parts_list]
        let dest_locations = [...this.state.dest_locations]
        let src_locations = [...this.state.src_locations]
        let current_page = this.state.current_page
        let total_pages = this.state.total_pages


        if (selected_operation_type.length === 1) {

            if (selected_operation_type[0].default_location_src_id && selected_operation_type[0].default_location_dest_id) {

                if (src_locations[current_page - 1] && dest_locations[current_page - 1]) {

                    if (src_locations[current_page - 1][2] === true && dest_locations[current_page - 1][2] === true) {

                        if (display_parts[current_page - 1].length === 0) {

                            src_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    } else if (src_locations[current_page - 1][2] === false && dest_locations[current_page - 1][2] === true) {
                        if (display_parts[current_page - 1].length === 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    } else if (src_locations[current_page - 1][2] === true && dest_locations[current_page - 1][2] === false) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })

                    } else if (src_locations[current_page - 1][2] === false && dest_locations[current_page - 1][2] === false) {
                        //probably will not happen
                        if (display_parts[current_page - 1].length === 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    }

                } else if (src_locations[current_page - 1] && !dest_locations[current_page - 1]) {
                    //probably will not happen
                    if (src_locations[current_page - 1][2] === true) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })
                    } else if (src_locations[current_page - 1][2] === false) {
                        if (display_parts[current_page - 1].length === 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        }
                    }

                } else if (!src_locations[current_page.length - 1] && dest_locations[current_page - 1]) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                }
                let stock_moves_locations = []
                //[[src_location_id,dest_location_id],[]]
                let stock_moves_unique_locations = []
                let same_stock_move_locations_indexes_list = []
                if (src_locations.length === dest_locations.length) {

                    for (let i = 0; i < src_locations.length; i++) {
                        if (!this.array_includes(stock_moves_unique_locations, [src_locations[i][0], dest_locations[i][0]])) {

                            stock_moves_unique_locations.push([src_locations[i][0], dest_locations[i][0]])
                        }
                        stock_moves_locations.push([src_locations[i][0], dest_locations[i][0]])
                    }

                    stock_moves_unique_locations.forEach((stock_moves_unique_location) => {
                        let same_stock_move_locations_indexes = []
                        stock_moves_locations.forEach((stock_move_location, index) => {
                            if (Array.isArray(stock_moves_unique_location) && Array.isArray(stock_move_location)) {
                                if (this.array_equals(stock_moves_unique_location, stock_move_location)) {
                                    same_stock_move_locations_indexes.push(index)
                                }
                            }
                        })
                        if (same_stock_move_locations_indexes.length > 1) {
                            same_stock_move_locations_indexes_list.push(same_stock_move_locations_indexes)
                        }
                    })
                }
                // [[1,2,3],[4,5,7]]
                if (same_stock_move_locations_indexes_list.length === 1) {

                    let same_stock_move_locations_indexes = same_stock_move_locations_indexes_list[0]
                    let combined_display_parts = []

                    for (let j = 0; j < same_stock_move_locations_indexes.length; j++) {
                        // closeIsSelect function to close selected items
                        if (j === same_stock_move_locations_indexes.length - 1) {
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        } else {
                            this.closeAllSelectedLines(display_parts[same_stock_move_locations_indexes[j]])
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        }

                    }
                    for (let k = 0; k < same_stock_move_locations_indexes.length; k++) {
                        if (k !== 0) {
                            display_parts.splice(same_stock_move_locations_indexes[k], 1)
                            src_locations.splice(same_stock_move_locations_indexes[k], 1)
                            dest_locations.splice(same_stock_move_locations_indexes[k], 1)
                        }
                    }
                    display_parts[same_stock_move_locations_indexes[0]] = combined_display_parts
                    current_page = same_stock_move_locations_indexes[0] + 1
                    total_pages = display_parts.length
                } else if (same_stock_move_locations_indexes_list.length === 0) {

                } else if (same_stock_move_locations_indexes_list.length > 0) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                }


            } else if (selected_operation_type[0].default_location_src_id && !selected_operation_type[0].default_location_dest_id) {

                if (src_locations[current_page - 1]) {

                    if (src_locations[current_page - 1][2] === true) {
                        if (display_parts[current_page - 1].length === 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    } else if (src_locations[current_page - 1][2] === false) {
                        if (display_parts[current_page - 1].length === 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            src_locations[current_page - 1] = [location[0], location[1], false]
                        }
                    }

                    let src_location_ids = []
                    let src_unique_locations = []
                    let same_src_locations_index_list = []

                    for (let i = 0; i < src_locations.length; i++) {
                        if (!src_location_ids.includes(src_locations[i][0])) {
                            src_unique_locations.push(src_locations[i][0])
                        }
                        src_location_ids.push(src_locations[i][0])
                    }

                    src_unique_locations.forEach((src_unique_location) => {
                        let same_src_locations_indexes = []
                        src_location_ids.forEach((src_location, index) => {
                            if (src_unique_location === src_location) {
                                same_src_locations_indexes.push(index)
                            }
                        })
                        if (same_src_locations_indexes.length > 1) {
                            same_src_locations_index_list.push(same_src_locations_indexes)
                        }
                    })

                    // [[1,2,3],[4,5,7]]
                    if (same_src_locations_index_list.length === 1) {

                        let same_src_locations_indexes = same_src_locations_index_list[0]
                        let combined_display_parts = []

                        for (let j = 0; j < same_src_locations_indexes.length; j++) {
                            // closeIsSelect function to close selected items
                            if (j === same_src_locations_indexes.length - 1) {
                                combined_display_parts.unshift(...display_parts[same_src_locations_indexes[j]])
                            } else {
                                this.closeAllSelectedLines(display_parts[same_src_locations_indexes[j]])
                                combined_display_parts.unshift(...display_parts[same_src_locations_indexes[j]])
                            }

                        }
                        for (let k = 0; k < same_src_locations_indexes.length; k++) {
                            if (k !== 0) {
                                display_parts.splice(same_src_locations_indexes[k], 1)
                                src_locations.splice(same_src_locations_indexes[k], 1)
                            }
                        }
                        display_parts[same_src_locations_indexes[0]] = combined_display_parts
                        current_page = same_src_locations_indexes[0] + 1
                        total_pages = display_parts.length
                    } else if (same_src_locations_index_list.length === 0) {

                    } else if (same_src_locations_index_list.length > 0) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })
                    }


                } else if (!src_locations[current_page - 1]) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                }


            }
        }

        this.display_parts_list = [...display_parts]

        let display_parts_state = []
        for (let i = 0; i < display_parts.length; i++) {
            let list1 = []
            let list2 = []
            let list3 = []
            display_parts[i].forEach((part) => {
                if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                    list1.push(part)
                } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                    list2.push(part)
                } else if (!part.genuine_stock_move) {
                    list3.push(part)
                } else {
                }
            })
            let display_parts_array = list1.concat(list3, list2)
            display_parts_state.push(display_parts_array)
        }

        this.state.display_parts = [...display_parts_state]
        // this.state.display_parts = [...display_parts]
        this.state.src_locations = [...src_locations]
        this.state.dest_locations = [...dest_locations]
        this.state.current_page = current_page
        this.state.total_pages = total_pages
    }

    selectDestLocation = (location) => {

        let selected_operation_type = [this.operation_type]
        let display_parts = [...this.display_parts_list]
        let dest_locations = [...this.state.dest_locations]
        let src_locations = [...this.state.src_locations]
        let current_page = this.state.current_page
        let total_pages = this.state.total_pages

        if (selected_operation_type.length === 1) {

            if (selected_operation_type[0].default_location_src_id && selected_operation_type[0].default_location_dest_id) {

                if (src_locations[current_page - 1] && dest_locations[current_page - 1]) {

                    if (src_locations[current_page - 1][2] === true && dest_locations[current_page - 1][2] === true) {

                        if (display_parts[current_page - 1].length === 0) {
                            this.notificationService.add("Please add products before selecting destination", {
                                title: "Error",
                                type: "danger",
                            })

                        } else if (display_parts[current_page - 1].length > 0) {
                            src_locations[current_page - 1] = [src_locations[current_page - 1][0], src_locations[current_page - 1][1], false]
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    } else if (src_locations[current_page - 1][2] === false && dest_locations[current_page - 1][2] === true) {
                        if (display_parts[current_page - 1].length === 0) {
                            this.notificationService.add("Please add products before selecting destination", {
                                title: "Error",
                                type: "danger",
                            })
                        } else if (display_parts[current_page - 1].length > 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    } else if (src_locations[current_page - 1][2] === true && dest_locations[current_page - 1][2] === false) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })

                    } else if (src_locations[current_page - 1][2] === false && dest_locations[current_page - 1][2] === false) {
                        //probably will not happen
                        if (display_parts[current_page - 1].length === 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    }

                } else if (src_locations[current_page - 1] && !dest_locations[current_page - 1]) {
                    //probably will not happen
                    if (src_locations[current_page - 1][2] === true) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })
                    } else if (src_locations[current_page - 1][2] === false) {
                        if (display_parts[current_page - 1].length === 0) {
                            this.notificationService.add("Please add products before selecting destination", {
                                title: "Error",
                                type: "danger",
                            })
                        } else if (display_parts[current_page - 1].length > 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        }
                    }

                } else if (!src_locations[current_page.length - 1] && dest_locations[current_page - 1]) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                }
                let stock_moves_locations = []
                //[[src_location_id,dest_location_id],[]]
                let stock_moves_unique_locations = []
                let same_stock_move_locations_indexes_list = []
                if (src_locations.length === dest_locations.length) {

                    for (let i = 0; i < src_locations.length; i++) {
                        if (!this.array_includes(stock_moves_unique_locations, [src_locations[i][0], dest_locations[i][0]])) {

                            stock_moves_unique_locations.push([src_locations[i][0], dest_locations[i][0]])
                        }
                        stock_moves_locations.push([src_locations[i][0], dest_locations[i][0]])
                    }

                    stock_moves_unique_locations.forEach((stock_moves_unique_location) => {
                        let same_stock_move_locations_indexes = []
                        stock_moves_locations.forEach((stock_move_location, index) => {
                            if (Array.isArray(stock_moves_unique_location) && Array.isArray(stock_move_location)) {
                                if (this.array_equals(stock_moves_unique_location, stock_move_location)) {
                                    same_stock_move_locations_indexes.push(index)
                                }
                            }
                        })
                        if (same_stock_move_locations_indexes.length > 1) {
                            same_stock_move_locations_indexes_list.push(same_stock_move_locations_indexes)
                        }
                    })
                }
                // [[1,2,3],[4,5,7]]
                if (same_stock_move_locations_indexes_list.length === 1) {

                    let same_stock_move_locations_indexes = same_stock_move_locations_indexes_list[0]
                    let combined_display_parts = []

                    for (let j = 0; j < same_stock_move_locations_indexes.length; j++) {
                        // closeIsSelect function to close selected items
                        if (j === same_stock_move_locations_indexes.length - 1) {
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        } else {
                            this.closeAllSelectedLines(display_parts[same_stock_move_locations_indexes[j]])
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        }

                    }
                    for (let k = 0; k < same_stock_move_locations_indexes.length; k++) {
                        if (k !== 0) {
                            display_parts.splice(same_stock_move_locations_indexes[k], 1)
                            src_locations.splice(same_stock_move_locations_indexes[k], 1)
                            dest_locations.splice(same_stock_move_locations_indexes[k], 1)
                        }
                    }
                    display_parts[same_stock_move_locations_indexes[0]] = combined_display_parts
                    current_page = same_stock_move_locations_indexes[0] + 1
                    total_pages = display_parts.length
                } else if (same_stock_move_locations_indexes_list.length === 0) {

                } else if (same_stock_move_locations_indexes_list.length > 0) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                    this.onPlaySound('error')
                }


            } else if (!selected_operation_type[0].default_location_src_id && selected_operation_type[0].default_location_dest_id) {

                if (dest_locations[current_page - 1]) {
                    if (dest_locations[current_page - 1][2] === true) {
                        if (display_parts[current_page - 1].length === 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        }

                    } else if (dest_locations[current_page - 1][2] === false) {
                        if (display_parts[current_page - 1].length === 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        } else if (display_parts[current_page - 1].length > 0) {
                            dest_locations[current_page - 1] = [location[0], location[1], false]
                        }
                    }

                    let dest_location_ids = []
                    //[[src_location_id,dest_location_id],[]]
                    let dest_unique_locations = []
                    let same_dest_locations_index_list = []

                    for (let i = 0; i < dest_locations.length; i++) {
                        if (!dest_location_ids.includes(dest_locations[i][0])) {
                            dest_unique_locations.push(dest_locations[i][0])
                        }
                        dest_location_ids.push(dest_locations[i][0])
                    }

                    dest_unique_locations.forEach((dest_unique_location) => {
                        let same_dest_locations_indexes = []
                        dest_location_ids.forEach((dest_location, index) => {
                            if (dest_unique_location === dest_location) {
                                same_dest_locations_indexes.push(index)
                            }
                        })
                        if (same_dest_locations_indexes.length > 1) {
                            same_dest_locations_index_list.push(same_dest_locations_indexes)
                        }
                    })

                    // [[1,2,3],[4,5,7]]
                    if (same_dest_locations_index_list.length === 1) {

                        let same_dest_locations_indexes = same_dest_locations_index_list[0]
                        let combined_display_parts = []

                        for (let j = 0; j < same_dest_locations_indexes.length; j++) {
                            // closeIsSelect function to close selected items
                            if (j === same_dest_locations_indexes.length - 1) {
                                combined_display_parts.unshift(...display_parts[same_dest_locations_indexes[j]])
                            } else {
                                this.closeAllSelectedLines(display_parts[same_dest_locations_indexes[j]])
                                combined_display_parts.unshift(...display_parts[same_dest_locations_indexes[j]])
                            }

                        }
                        for (let k = 0; k < same_dest_locations_indexes.length; k++) {
                            if (k !== 0) {
                                display_parts.splice(same_dest_locations_indexes[k], 1)
                                dest_locations.splice(same_dest_locations_indexes[k], 1)
                            }
                        }
                        display_parts[same_dest_locations_indexes[0]] = combined_display_parts
                        current_page = same_dest_locations_indexes[0] + 1
                        total_pages = display_parts.length
                    } else if (same_dest_locations_index_list.length === 0) {

                    } else if (same_dest_locations_index_list.length > 0) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })
                        this.onPlaySound('error')
                    }


                } else if (!dest_locations[current_page - 1]) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                }


            }
        }

        this.display_parts_list = [...display_parts]

        let display_parts_state = []
        for (let i = 0; i < display_parts.length; i++) {
            let list1 = []
            let list2 = []
            let list3 = []
            display_parts[i].forEach((part) => {
                if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                    list1.push(part)
                } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                    list2.push(part)
                } else if (!part.genuine_stock_move) {
                    list3.push(part)
                } else {
                }
            })
            let display_parts_array = list1.concat(list3, list2)
            display_parts_state.push(display_parts_array)
        }

        this.state.display_parts = [...display_parts_state]
        // this.state.display_parts = [...display_parts]
        this.state.src_locations = [...src_locations]
        this.state.dest_locations = [...dest_locations]
        this.state.current_page = current_page
        this.state.total_pages = total_pages
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


    // src_locations=[[1,WH/STOCK,true],[]]
    selectScannedLocation = (location) => {
        let selected_operation_type = [this.operation_type]
        // let selected_operation_type = [...this.state.selected_operation_type]
        let display_parts = [...this.display_parts_list]
        // let display_part_unique = [...this.display_parts_list_unique]
        let dest_locations = [...this.state.dest_locations]
        let src_locations = [...this.state.src_locations]
        let current_page = this.state.current_page
        let total_pages = this.state.total_pages
        if (selected_operation_type.length === 1) {


            if (selected_operation_type[0].default_location_src_id && selected_operation_type[0].default_location_dest_id) {
                if (src_locations[src_locations.length - 1] && dest_locations[dest_locations.length - 1]) {

                    if (src_locations[src_locations.length - 1][2] === true && dest_locations[dest_locations.length - 1][2] === true) {
                        if (display_parts[display_parts.length - 1].length === 0) {
                            src_locations[src_locations.length - 1] = [location[0], location[1], false]
                        } else if (display_parts[display_parts.length - 1].length > 0) {
                            src_locations[src_locations.length - 1] = [location[0], location[1], false]
                        }

                    } else if (src_locations[src_locations.length - 1][2] === false && dest_locations[dest_locations.length - 1][2] === true) {
                        if (display_parts[display_parts.length - 1].length === 0) {
                            src_locations[src_locations.length - 1] = [location[0], location[1], false]
                        } else if (display_parts[display_parts.length - 1].length > 0) {
                            dest_locations[dest_locations.length - 1] = [location[0], location[1], false]
                        }

                    } else if (src_locations[src_locations.length - 1][2] === true && dest_locations[dest_locations.length - 1][2] === false) {

                    } else if (src_locations[src_locations.length - 1][2] === false && dest_locations[dest_locations.length - 1][2] === false) {
                        //probably will not happen
                        if (display_parts[display_parts.length - 1].length === 0) {
                            this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                                title: "Error",
                                type: "danger",
                            })
                        } else if (display_parts[display_parts.length - 1].length > 0) {
                            display_parts.push([])
                            // display_part_unique.push([])
                            src_locations.push([location[0], location[1], false])
                            dest_locations.push(false)
                            total_pages++
                        }

                    }

                } else if (src_locations[src_locations.length - 1] && !dest_locations[dest_locations.length - 1]) {
                    //probably will not happen
                    if (src_locations[src_locations.length - 1][2] === true) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })
                        this.onPlaySound('error')
                    } else if (src_locations[src_locations.length - 1][2] === false) {
                        if (display_parts[display_parts.length - 1].length === 0) {
                            src_locations[src_locations.length - 1] = [location[0], location[1], false]
                        } else if (display_parts[display_parts.length - 1].length > 0) {
                            dest_locations[dest_locations.length - 1] = [location[0], location[1], false]
                        }
                    }

                } else if (!src_locations[src_locations.length - 1] && dest_locations[dest_locations - 1]) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                    this.onPlaySound('error')
                } else if (!src_locations[src_locations.length - 1] && !dest_locations[dest_locations - 1]) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                    this.onPlaySound('error')
                }
                let stock_moves_locations = []
                //[[src_location_id,dest_location_id],[]]
                let stock_moves_unique_locations = []
                let same_stock_move_locations_indexes_list = []
                if (src_locations.length === dest_locations.length) {

                    for (let i = 0; i < src_locations.length; i++) {
                        if (!this.array_includes(stock_moves_unique_locations, [src_locations[i][0], dest_locations[i][0]])) {
                            stock_moves_unique_locations.push([src_locations[i][0], dest_locations[i][0]])
                        }
                        stock_moves_locations.push([src_locations[i][0], dest_locations[i][0]])
                    }

                    stock_moves_unique_locations.forEach((stock_moves_unique_location) => {
                        let same_stock_move_locations_indexes = []
                        stock_moves_locations.forEach((stock_move_location, index) => {
                            if (Array.isArray(stock_moves_unique_location) && Array.isArray(stock_move_location)) {
                                if (this.array_equals(stock_moves_unique_location, stock_move_location)) {
                                    same_stock_move_locations_indexes.push(index)
                                }
                            }
                        })
                        if (same_stock_move_locations_indexes.length > 1) {
                            same_stock_move_locations_indexes_list.push(same_stock_move_locations_indexes)
                        }
                    })
                }
                // [[1,2,3],[4,5,7]]
                if (same_stock_move_locations_indexes_list.length === 1) {

                    let same_stock_move_locations_indexes = same_stock_move_locations_indexes_list[0]
                    let combined_display_parts = []

                    for (let j = 0; j < same_stock_move_locations_indexes.length; j++) {
                        // closeIsSelect function to close selected items
                        if (j === same_stock_move_locations_indexes.length - 1) {
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        } else {
                            this.closeAllSelectedLines(display_parts[same_stock_move_locations_indexes[j]])
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        }

                    }
                    for (let k = 0; k < same_stock_move_locations_indexes.length; k++) {
                        if (k !== 0) {
                            display_parts.splice(same_stock_move_locations_indexes[k], 1)
                            src_locations.splice(same_stock_move_locations_indexes[k], 1)
                            dest_locations.splice(same_stock_move_locations_indexes[k], 1)
                        }
                    }
                    display_parts[same_stock_move_locations_indexes[0]] = combined_display_parts
                    current_page = same_stock_move_locations_indexes[0] + 1
                    total_pages = display_parts.length
                } else if (same_stock_move_locations_indexes_list.length === 0) {
                    current_page = display_parts.length
                } else if (same_stock_move_locations_indexes_list.length > 0) {
                    this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                        title: "Error",
                        type: "danger",
                    })
                }


            } else if (selected_operation_type[0].default_location_src_id && !selected_operation_type[0].default_location_dest_id) {

                if (display_parts.length > 0) {
                    if (src_locations[src_locations.length - 1]) {

                        let scanned_location_index = []
                        src_locations.forEach((src_location, index) => {
                            if (src_location[0] === location[0]) {
                                scanned_location_index.push(index)
                            }
                        })
                        if (scanned_location_index.length === 1) {
                            if (src_locations[src_locations.length - 1][2] === true) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    src_locations[src_locations.length - 1] = [location[0], location[1], false]
                                    current_page = scanned_location_index[0] + 1
                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    src_locations[src_locations.length - 1] = [location[0], location[1], false]
                                    current_page = scanned_location_index[0] + 1
                                }

                            } else if (src_locations[src_locations.length - 1][2] === false) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    current_page = scanned_location_index[0] + 1
                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    current_page = scanned_location_index[0] + 1
                                }
                            }
                        } else if (scanned_location_index.length === 0) {
                            if (src_locations[src_locations.length - 1][2] === true) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    src_locations[src_locations.length - 1] = [location[0], location[1], false]
                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    src_locations[src_locations.length - 1] = [location[0], location[1], false]
                                }
                            } else if (src_locations[src_locations.length - 1][2] === false) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    src_locations[src_locations.length - 1] = [location[0], location[1], false]
                                    current_page = display_parts.length

                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    display_parts.push([])
                                    // display_part_unique.push([])
                                    src_locations.push([location[0], location[1], false])
                                    dest_locations.push(this.picking_dest_location)
                                    current_page = display_parts.length
                                    total_pages++
                                }
                            }
                        }

                    } else if (!src_locations[src_locations.length - 1]) {

                    }

                }

            } else if (!selected_operation_type[0].default_location_src_id && selected_operation_type[0].default_location_dest_id) {

                if (display_parts.length > 0) {
                    if (dest_locations[dest_locations.length - 1]) {

                        let scanned_location_index = []
                        dest_locations.forEach((dest_location, index) => {
                            if (dest_location[0] === location[0]) {
                                scanned_location_index.push(index)
                            }
                        })
                        if (scanned_location_index.length === 1) {
                            if (dest_locations[dest_locations.length - 1][2] === true) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    dest_locations[dest_locations.length - 1] = [location[0], location[1], false]
                                    current_page = scanned_location_index[0] + 1
                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    dest_locations[dest_locations.length - 1] = [location[0], location[1], false]
                                    current_page = scanned_location_index[0] + 1
                                }

                            } else if (dest_locations[dest_locations.length - 1][2] === false) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    current_page = scanned_location_index[0] + 1
                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    current_page = scanned_location_index[0] + 1
                                }
                            }
                        } else if (scanned_location_index.length === 0) {
                            if (dest_locations[dest_locations.length - 1][2] === true) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    dest_locations[dest_locations.length - 1] = [location[0], location[1], false]
                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    dest_locations[dest_locations.length - 1] = [location[0], location[1], false]
                                }
                            } else if (dest_locations[dest_locations.length - 1][2] === false) {
                                if (display_parts[display_parts.length - 1].length === 0) {
                                    dest_locations[dest_locations.length - 1] = [location[0], location[1], false]
                                    current_page = display_parts.length
                                } else if (display_parts[display_parts.length - 1].length > 0) {
                                    display_parts.push([])
                                    src_locations.push(this.picking_src_location)
                                    dest_locations.push([location[0], location[1], false])
                                    current_page = display_parts.length
                                    total_pages++
                                }
                            }

                        }

                    } else if (!dest_locations[dest_locations.length - 1]) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })
                    }
                }

            }
        } else {
            this.notificationService.add("Please scan or select operation type", {
                title: "Error",
                type: "danger",
            })
            this.onPlaySound('error')
        }

        this.display_parts_list = [...display_parts]
        let display_parts_state = []
        for (let i = 0; i < display_parts.length; i++) {
            let list1 = []
            let list2 = []
            let list3 = []
            display_parts[i].forEach((part) => {
                if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                    list1.push(part)
                } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                    list2.push(part)
                } else if (!part.genuine_stock_move) {
                    list3.push(part)
                } else {
                }
            })
            let display_parts_array = list1.concat(list3, list2)
            display_parts_state.push(display_parts_array)
        }


        this.state.display_parts = [...display_parts_state]
        // this.state.display_parts = [...display_parts]
        this.state.src_locations = [...src_locations]
        this.state.dest_locations = [...dest_locations]
        this.state.current_page = current_page
        this.state.total_pages = total_pages

    }

    addProduct = (selected_part, quantity) => {
        this.addToDisplayPartsAddProduct([selected_part], quantity)
    }

    addToDisplayParts(scanned_part, quantity) {
        let current_page = this.state.current_page
        let indexes_of_scanned_product_moves = []
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        if (scanned_part[0].tracking === 'none') {

            //create a list of indexes of scanned item inside the stock moves
            display_parts_list_copy.forEach((stock_move, index) => {
                if (scanned_part[0].id === stock_move.data.product_id) {
                    indexes_of_scanned_product_moves.push(index)
                }
            })

            if (indexes_of_scanned_product_moves.length === 1) {
                display_parts_list_copy = this.closeAllSelectedLines(display_parts_list_copy)
                let stock_move = display_parts_list_copy[indexes_of_scanned_product_moves[0]]
                if (!stock_move.genuine_stock_move) {

                    if (this.scanned_order_ids[this.scanned_order_ids.length - 1] === scanned_part[0].id) {
                        stock_move.is_selected = true
                        stock_move.data.qty_done += quantity
                        this.scanned_order_ids.push(scanned_part[0].id)
                    } else if (this.scanned_order_ids[this.scanned_order_ids.length - 1] !== scanned_part[0].id) {

                        display_parts_list_copy.unshift(
                            {
                                id: this.line_id,
                                is_selected: true,
                                genuine_stock_move: false,
                                data: {
                                    display_name: scanned_part[0].display_name,
                                    product_id: scanned_part[0].id,
                                    // product_qty: 0,
                                    reserved_uom_qty: 0,
                                    qty_done: quantity
                                }
                            }
                        )
                        this.line_id++
                        this.scanned_order_ids.push(scanned_part[0].id)
                    }


                } else if (stock_move.genuine_stock_move) {
                    if (stock_move.data.reserved_uom_qty > stock_move.data.qty_done) {
                        stock_move.is_selected = true
                        stock_move.data.qty_done += quantity
                        this.scanned_order_ids.push(scanned_part[0].id)
                    } else if (stock_move.data.reserved_uom_qty <= stock_move.data.qty_done) {
                        display_parts_list_copy.unshift(
                            {
                                id: this.line_id,
                                is_selected: true,
                                genuine_stock_move: false,
                                data: {
                                    id: false,
                                    display_name: scanned_part[0].display_name,
                                    name: scanned_part[0].name,
                                    write_date: scanned_part[0].write_date,
                                    default_code: scanned_part[0].default_code,
                                    weight: scanned_part[0].weight,
                                    product_id: scanned_part[0].id,
                                    // product_qty: 0,
                                    reserved_uom_qty: 0,
                                    qty_done: quantity
                                }
                            }
                        )
                        this.line_id++
                        this.scanned_order_ids.push(scanned_part[0].id)
                    }
                }

            } else if (indexes_of_scanned_product_moves.length === 0) {
                display_parts_list_copy = this.closeAllSelectedLines(display_parts_list_copy)
                display_parts_list_copy.unshift(
                    {
                        id: this.line_id,
                        is_selected: true,
                        genuine_stock_move: false,
                        data: {
                            id: false,
                            display_name: scanned_part[0].display_name,
                            name: scanned_part[0].name,
                            write_date: scanned_part[0].write_date,
                            default_code: scanned_part[0].default_code,
                            weight: scanned_part[0].weight,
                            product_id: scanned_part[0].id,
                            // product_qty: 0,
                            reserved_uom_qty: 0,
                            qty_done: quantity
                        }
                    }
                )
                this.line_id++
                this.scanned_order_ids.push(scanned_part[0].id)
            } else if (indexes_of_scanned_product_moves.length > 1) {
                display_parts_list_copy = this.closeAllSelectedLines(display_parts_list_copy)

                let genuine_stock_move_index = []
                let non_genuine_stock_move_index = []

                indexes_of_scanned_product_moves.forEach((stock_move_index) => {
                        let stock_move = display_parts_list_copy[stock_move_index]
                        if (stock_move.genuine_stock_move) {
                            genuine_stock_move_index.push(stock_move_index)
                        } else if (!stock_move.genuine_stock_move) {
                            non_genuine_stock_move_index.push(stock_move_index)
                        }
                    }
                )

                if (genuine_stock_move_index.length > 0) {

                    let not_completed_moves = []
                    let completed_moves = []
                    for (var i = 0; i <= genuine_stock_move_index.length - 1; i++) {
                        let stock_move = display_parts_list_copy[genuine_stock_move_index[i]]
                        if (stock_move.data.reserved_uom_qty <= stock_move.data.qty_done) {
                            completed_moves.push(genuine_stock_move_index[i])
                        } else if (stock_move.data.reserved_uom_qty > stock_move.data.qty_done) {
                            not_completed_moves.push(genuine_stock_move_index[i])
                        }
                    }
                    if (not_completed_moves.length > 0) {
                        let stock_move = display_parts_list_copy[not_completed_moves[0]]
                        if (stock_move.data.reserved_uom_qty > stock_move.data.qty_done) {
                            stock_move.is_selected = true
                            stock_move.data.qty_done += quantity
                            this.scanned_order_ids.push(scanned_part[0].id)
                        }
                    } else if (completed_moves.length > 0) {
                        if (this.scanned_order_ids[this.scanned_order_ids.length - 1] === scanned_part[0].id) {
                            //chech weather non genuine indexes is not empty
                            if (non_genuine_stock_move_index.length > 0) {
                                display_parts_list_copy[non_genuine_stock_move_index[0]].is_selected = true
                                display_parts_list_copy[non_genuine_stock_move_index[0]].data.qty_done += quantity
                                this.scanned_order_ids.push(scanned_part[0].id)
                            } else if (non_genuine_stock_move_index.length === 0) {

                                display_parts_list_copy.unshift(
                                    {
                                        id: this.line_id,
                                        is_selected: true,
                                        genuine_stock_move: false,
                                        data: {

                                            id: false,
                                            display_name: scanned_part[0].display_name,
                                            name: scanned_part[0].name,
                                            write_date: scanned_part[0].write_date,
                                            default_code: scanned_part[0].default_code,
                                            weight: scanned_part[0].weight,
                                            product_id: scanned_part[0].id,
                                            // product_qty: 0,
                                            reserved_uom_qty: 0,
                                            qty_done: quantity
                                        }
                                    }
                                )
                                this.line_id++
                                this.scanned_order_ids.push(scanned_part[0].id)
                            }

                        } else if (this.scanned_order_ids[this.scanned_order_ids.length - 1] !== scanned_part[0].id) {
                            display_parts_list_copy.unshift(
                                {
                                    id: this.line_id,
                                    is_selected: true,
                                    genuine_stock_move: false,
                                    data: {
                                        id: false,
                                        display_name: scanned_part[0].display_name,
                                        name: scanned_part[0].name,
                                        write_date: scanned_part[0].write_date,
                                        default_code: scanned_part[0].default_code,
                                        weight: scanned_part[0].weight,
                                        product_id: scanned_part[0].id,
                                        // product_qty: 0,
                                        reserved_uom_qty: 0,
                                        qty_done: quantity
                                    }
                                }
                            )
                            this.line_id++
                            this.scanned_order_ids.push(scanned_part[0].id)
                        }

                    }

                } else if (non_genuine_stock_move_index.length > 0) {
                    let stock_move = display_parts_list_copy[non_genuine_stock_move_index[0]]
                    if (this.scanned_order_ids[this.scanned_order_ids.length - 1] === scanned_part[0].id) {
                        stock_move.is_selected = true
                        stock_move.data.qty_done += quantity
                        this.scanned_order_ids.push(scanned_part[0].id)
                        // break
                    } else if (this.scanned_order_ids[this.scanned_order_ids.length - 1] !== scanned_part[0].id) {
                        display_parts_list_copy.unshift(
                            {
                                id: this.line_id,
                                is_selected: true,
                                genuine_stock_move: false,
                                data: {
                                    id: false,
                                    display_name: scanned_part[0].display_name,
                                    name: scanned_part[0].name,
                                    write_date: scanned_part[0].write_date,
                                    default_code: scanned_part[0].default_code,
                                    weight: scanned_part[0].weight,
                                    product_id: scanned_part[0].id,
                                    // product_qty: 0,
                                    reserved_uom_qty: 0,
                                    qty_done: quantity
                                }
                            }
                        )
                        this.line_id++
                        this.scanned_order_ids.push(scanned_part[0].id)

                    }
                }

            }
        } else {
            this.notificationService.add("Sorry you cannot edit inventory with tracking", {
                title: "Error",
                type: "danger",
            });
            this.onPlaySound("error")
        }


        this.display_parts_list[current_page - 1] = display_parts_list_copy
        let list1 = []
        let list2 = []
        let list3 = []
        display_parts_list_copy.forEach((part) => {
            if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                list1.push(part)
            } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                list2.push(part)
            } else if (!part.genuine_stock_move) {
                list3.push(part)
            } else {
            }
        })

        let display_parts_array = list1.concat(list3, list2)

        this.state.display_parts[current_page - 1] = display_parts_array
        // this.state.display_parts[current_page - 1] = display_parts_list_copy

    }

    addToDisplayPartsAddProduct = (scanned_part, quantity) => {
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]

        if (scanned_part[0].tracking === 'none') {
            display_parts_list_copy = this.closeAllSelectedLines(display_parts_list_copy)
            display_parts_list_copy.unshift(
                {
                    id: this.line_id,
                    is_selected: true,
                    genuine_stock_move: false,
                    data: {
                        id: false,
                        display_name: scanned_part[0].display_name,
                        name: scanned_part[0].name,
                        write_date: scanned_part[0].write_date,
                        default_code: scanned_part[0].default_code,
                        weight: scanned_part[0].weight,
                        product_id: scanned_part[0].id,
                        // product_qty: 0,
                        reserved_uom_qty: 0,
                        qty_done: quantity
                    }
                }
            )
            this.line_id++
            this.scanned_order_ids.push(scanned_part[0].id)

        } else {
            this.notificationService.add("Sorry you cannot edit inventory with tracking", {
                title: "Error",
                type: "danger",
            });
            this.onPlaySound("error")

        }
        this.display_parts_list[current_page - 1] = display_parts_list_copy


        let list1 = []
        let list2 = []
        let list3 = []
        display_parts_list_copy.forEach((part) => {
            if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                list1.push(part)
            } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                list2.push(part)
            } else if (!part.genuine_stock_move) {
                list3.push(part)
            } else {
            }
        })

        let display_parts_array = list1.concat(list3, list2)

        this.state.display_parts[current_page - 1] = display_parts_array
        // this.state.display_parts[current_page - 1] = [...display_parts_list_copy]

    }

    handleClickPlus = (stock_move) => {
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let stock_move_ids = []
        let selected_stock_move_id_index;
        this.display_parts_list[current_page - 1].forEach((stock_move) => {
            stock_move_ids.push(stock_move.id)
        })

        stock_move_ids.forEach((stock_move_id, index) => {
            if (stock_move.id === stock_move_id) {
                selected_stock_move_id_index = index
            }
        })
        if (display_parts_list_copy[selected_stock_move_id_index].id === stock_move.id) {
            stock_move.data.qty_done += 1

        }
        this.display_parts_list[current_page - 1] = display_parts_list_copy

        let list1 = []
        let list2 = []
        let list3 = []
        display_parts_list_copy.forEach((part) => {
            if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                list1.push(part)
            } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                list2.push(part)
            } else if (!part.genuine_stock_move) {
                list3.push(part)
            } else {
            }
        })

        let display_parts_array = list1.concat(list3, list2)

        this.state.display_parts[current_page - 1] = display_parts_array

    }

    handleClickTotalQuantity = (stock_move) => {
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let stock_move_ids = []
        let selected_stock_move_id_index;
        this.display_parts_list[current_page - 1].forEach((stock_move) => {
            stock_move_ids.push(stock_move.id)
        })

        stock_move_ids.forEach((stock_move_id, index) => {
            if (stock_move.id === stock_move_id) {
                selected_stock_move_id_index = index
            }
        })
        if (display_parts_list_copy[selected_stock_move_id_index].id === stock_move.id) {
            stock_move.data.qty_done += stock_move.data.reserved_uom_qty - stock_move.data.qty_done

        }
        this.display_parts_list[current_page - 1] = display_parts_list_copy

        let list1 = []
        let list2 = []
        let list3 = []
        display_parts_list_copy.forEach((part) => {
            if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                list1.push(part)
            } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                list2.push(part)
            } else if (!part.genuine_stock_move) {
                list3.push(part)
            } else {
            }
        })

        let display_parts_array = list1.concat(list3, list2)

        this.state.display_parts[current_page - 1] = display_parts_array

    }

    handleClickMinus = (stock_move) => {
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let stock_move_ids = []
        let selected_stock_move_id_index;
        this.display_parts_list[current_page - 1].forEach((stock_move) => {
            stock_move_ids.push(stock_move.id)
        })

        stock_move_ids.forEach((stock_move_id, index) => {
            if (stock_move.id === stock_move_id) {
                selected_stock_move_id_index = index
            }
        })
        if (display_parts_list_copy[selected_stock_move_id_index].id === stock_move.id) {
            if (stock_move.data.qty_done > 0) {
                stock_move.data.qty_done -= 1
            }
        }
        this.display_parts_list[current_page - 1] = display_parts_list_copy

        let list1 = []
        let list2 = []
        let list3 = []
        display_parts_list_copy.forEach((part) => {
            if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                list1.push(part)
            } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                list2.push(part)
            } else if (!part.genuine_stock_move) {
                list3.push(part)
            } else {
            }
        })

        let display_parts_array = list1.concat(list3, list2)

        this.state.display_parts[current_page - 1] = display_parts_array

    }
    discardValidatePopUp = () => {
        this.state.validate_popup = false
    }
    validatePopUp = () => {
        this.state.validate_popup = true
    }
    applyTransfer = async () => {
//        const barcode = useService("barcode");
//        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.off('barcode_scanned', this, this.scan1);
        await this.validateTransfer()
        this.state.validate_popup = false
        this.goBackScreen()
    }
    applyValidateTransfer = async () => {
//        const barcode = useService("barcode");
//        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.off('barcode_scanned', this, this.scan1);
        await this.validateTransfer()
        this.state.validate_popup = false
        let e = await this.orm.call('stock.picking', 'button_validate', [[this.picking.id]], {})
        if (e !== true) {
            let c = await this.actionService.doAction(e)
        }
        this.goBackScreen()
    }

    discardBackButtonPopup = () => {
        this.state.back_popup = false
    }
    backButtonPopup = () => {
        this.state.back_popup = true
    }

    addLocationPopup = async () => {
        this.state.add_location_popup = true
        this.locations.locations_list = await this.orm.searchRead("stock.location", [], [], {limit: 100})
    }
    backLocationPopup = () => {
        this.state.add_location_popup = false
    }

    editPopup = async (stock_move) => {
        this.edit_popup_part = stock_move
        Object.assign(this.state, {add_products_popup: false, edit_popup: true, scanning_display: false})


// ##try to fit two states to one state

    }
    backButtonEditPopUp = () => {
        this.state.edit_popup = false
        this.state.scanning_display = true
        this.add_products_popup = false
    }
    editPopUpConfirmButton = (display_value) => {
        this.confirmChange(this.edit_popup_part, display_value)
    }

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_128&id=${id}&write_date=${write_date}&unique=1`;
    }

// display_parts:[[{id:1,stock_move:move, genuine_stock_move: true ,data:{} },{id:1,stock_move:move, genuine_stock_move: true ,data:{}}] , [{stock_move:move ,done_qty:qty },{stock_move:move ,done_qty:qty }]]


    confirmChange = (stock_move, scanned_amount) => {
        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let stock_move_ids = []
        let selected_stock_move_id_index;
        this.display_parts_list[current_page - 1].forEach((stock_move) => {
            stock_move_ids.push(stock_move.id)
        })

        stock_move_ids.forEach((stock_move_id, index) => {
            if (stock_move.id === stock_move_id) {
                selected_stock_move_id_index = index
            }
        })
        if (display_parts_list_copy[selected_stock_move_id_index].id === stock_move.id) {

            stock_move.data.qty_done = parseInt(scanned_amount)
            // break
        }
        this.display_parts_list[current_page - 1] = display_parts_list_copy

        let list1 = []
        let list2 = []
        let list3 = []
        display_parts_list_copy.forEach((part) => {
            if (part.genuine_stock_move && part.data.reserved_uom_qty > part.data.qty_done) {
                list1.push(part)
            } else if (part.genuine_stock_move && part.data.reserved_uom_qty <= part.data.qty_done) {
                list2.push(part)
            } else if (!part.genuine_stock_move) {
                list3.push(part)
            } else {
            }
        })

        let display_parts_array = list1.concat(list3, list2)

        this.state.display_parts[current_page - 1] = display_parts_array

        Object.assign(this.state, {add_products_popup: false, edit_popup: false, scanning_display: true})
    }

    validateTransfer = async () => {

        let display_parts_complex = this.state.display_parts
        let data = {
            display_parts_complex: display_parts_complex,
            src_locations: this.state.src_locations,
            dest_locations: this.state.dest_locations
        }
        let e = await this.orm.call('warehouse.operation.barcode', 'validate_barcode', [[], data, this.picking.id], {})
        console.log(e)
    }


    addProductPopup = () => {
        Object.assign(this.state, {add_products_popup: true, edit_popup: false, scanning_display: false})
    }
    backButtonAddProductPopup = () => {
        Object.assign(this.state, {add_products_popup: false, edit_popup: false, scanning_display: true})
    }
    goBackScreen = () => {
        Object.assign(this.state, {
            add_products_popup: false,
            edit_popup: false,
            scanning_display: false,
            go_back_screen: true
        })
    }

    backButton = () => {
//        const barcode = useService("barcode");
//        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.off('barcode_scanned', this, this.scan1);
        console.log('warehouseoperation.js --> backButton');
//        if (this.env.config.breadcrumbs.length > 0) {
//            this.actionService.restore();
//            this.env.config.historyBack();
            this.actionService.doAction(
                {
                    name: 'Warehouse Operations',
                    type: 'ir.actions.client',
                    target: '',
                    tag: 'warehouse_operation'
                }
            )
//        }
    }


}

export class BarcodeLineTransferWarehouse extends Component {
    constructor() {
        super(...arguments);
    }
}

WarehouseOperation.template = "custom_barcode_app.WarehouseOperation"
BarcodeLineTransferWarehouse.template = "custom_barcode_app.BarcodeLineTransferWarehouse"
WarehouseOperation.components = {
    EditPopUpComponent1,
    SelectDropDown,
    SelectDropDownLocation,
    AddProductsPopUp,
    BarcodeLineTransferWarehouse,
    SelectAddDropDownLocation,
    SelectDropDownLocationSrc,
    SelectDropDownLocationDest,
};
registry.category("actions").add('warehouse_picking_operations', WarehouseOperation);
