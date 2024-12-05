/** @odoo-module **/

import {useService, useListener, useBus} from "@web/core/utils/hooks";

const {Component, useState, useExternalListener, useRef, useEffect, onWillStart, onWillUnmount} = owl;
import {Mutex} from "@web/core/utils/concurrency";
//import core from 'web.core';
import { registry } from "@web/core/registry";
console.log('Javascript File loaded successfully !!');
import {EditPopUpComponent} from "@custom_barcode_app/js/inventory_transfer_components/EditPopUpComponent";
import {SelectDropDown} from "@custom_barcode_app/js/basic_components/SelectDropDown"
import {
    SelectDropDownLocationSrc,
    SelectDropDownLocationDest
} from "@custom_barcode_app/js/basic_components/SelectDropDownLocation";
import {AddProductsPopUp} from "@custom_barcode_app/js/warehouse_operations/AddProductsPopUp";
import {SelectAddDropDownLocation} from "@custom_barcode_app/js/basic_components/SelectDropDown"


export class ScanningDisplay extends Component {


    constructor(...args) {
        super(...args);
        // display_parts:[[{product data },{product data }] , [{product data },{product data }]]

        // {
        //     id: this.line_id,
        //     is_selected: true,
        //     data: {
        //         product_id: scanned_part[0].id,
        //         display_name: scanned_part[0].display_name,
        //         quantity: 0,
        //         weight:
        //     }
        // }
        //     source_location:[[{}],[{}]]

        this.state = useState({
            display_parts: [[]],
            current_page: 1,
            total_pages: 1,
            edit_popup: false,
            add_products_popup: false,
            scanning_display: true,
            selected_operation_type: [],
            // source_locations:[[{}],[{}]],
            source_locations: [],
            dest_locations: [],
            message: "",
            sort_by: 'order',
            add_location_popup: false,
            change_operation_type: false,
            back_popup: false,
            groups: {},
            validate_popup: false,

        })
        this.locations = useState({
            locations_list: [],
            location: [],
        })
    }

    setup() {

        this.orm = useService("orm");
        this.rpcService = useService("rpc");
        this.actionService = useService("action");
        this.notificationService = useService("notification");
        this.mutex = new Mutex();
        const barcode = useService("barcode");
        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.on('barcode_scanned', this, this.scan1);
        this.display_part_id = 1
        this.display_part_unique_id = 1
        this.display_parts_list = [[]]
        this.display_parts_list_unique = [[]]
        this.edit_popup_part = {}
        this.operation_types = []
        this.child_src_locations = []
        this.child_dest_locations = []
        this.selected_operation_type_temp = {}
        this.barcode_line = useRef('barcodeLine')
        this.barcode_line_box = useRef('barcodeLineBox')
        useEffect(
            () => {
                this.getChildrenNodes()
            },
            () => [JSON.stringify(this.state.display_parts[this.state.current_page - 1])]
        );

        onWillStart(async () => {

            let internal_operations = await this.orm.searchRead("stock.picking.type", [], ["id", "default_location_src_id", "default_location_dest_id", "display_name", "name", "warehouse_id"], {limit: 100})
            if (internal_operations.length > 0) {
                this.operation_types = internal_operations

            } else {

            }

            if (this.props.action.params.picking_type_id && this.props.action.params.selected_location) {
                let internal_operations = await this.orm.searchRead("stock.picking.type", [["id", "=", this.props.action.params.picking_type_id]], ["id", "default_location_src_id", "default_location_dest_id", "display_name", "name", "warehouse_id"], {limit: 100})
                await this.selectOperationType(internal_operations[0])
                await this.selectScannedLocation(this.props.action.params.selected_location)
            } else if (this.props.action.params.picking_type_id && !this.props.action.params.selected_location) {
                let internal_operations = await this.orm.searchRead("stock.picking.type", [["id", "=", this.props.action.params.picking_type_id]], ["id", "default_location_src_id", "default_location_dest_id", "display_name", "name", "warehouse_id"], {limit: 100})
                await this.selectOperationType(internal_operations[0])
            } else if (!this.props.action.params.picking_type_id && !this.props.action.params.selected_location) {

            }
        });
//        onWillUnmount(() => {
//            useBus(barcode.bus, 'barcode_scanned', this, this.scan1);
            //core.bus.off('barcode_scanned', this, this.scan1);
//        });


    }


    // ["code", "=", "internal"]


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

    changeSelectOperationType = (selected_operation) => {

        if (this.state.selected_operation_type.length > 0) {
            this.selected_operation_type_temp = selected_operation
            this.state.change_operation_type = true
        } else {
            this.selectOperationType(selected_operation)
        }
    }

    applySelectOperationType = () => {
        this.selectOperationType(this.selected_operation_type_temp)
        this.state.change_operation_type = false
    }
    cancelChangeOperationType = () => {
        this.state.change_operation_type = false
    }

    selectOperationType = async (selected_operation) => {
        if (selected_operation) {
            let data = await this.getStockOperationTypeData(selected_operation.id)
            this.child_src_locations = data.child_src_locations
            this.child_dest_locations = data.child_dest_locations
            this.source_location_default = data.source_location_default
            this.dest_location_default = data.dest_location_default
            this.display_parts_list = [[]]
            this.display_parts_list_unique = [[]]
            this.state.groups = data.groups
            this.state.selected_operation_type = [selected_operation]
            this.state.display_parts = [[]]
            this.state.source_locations = [data.source_locations]
            this.state.dest_locations = [data.dest_locations]
            this.state.current_page = 1
            this.state.total_pages = 1

        } else {
            this.notificationService.add("Please scan or select operation type", {
                title: "Error",
                type: "danger",
            })
        }
    }
    selectAddLocation = (selected_location) => {
        this.selectScannedLocation([selected_location.id, selected_location.display_name])
        this.locations.location = [selected_location]
        this.backLocationPopup()
    }

    // src_locations=[[1,WH/STOCK,true],[]]
    selectScannedLocation = (location) => {
        let selected_operation_type = [...this.state.selected_operation_type]
        let display_parts = [...this.display_parts_list]
        let display_part_unique = [...this.display_parts_list_unique]
        let dest_locations = [...this.state.dest_locations]
        let src_locations = [...this.state.source_locations]
        let current_page = this.state.current_page
        let total_pages = this.state.total_pages

        if (this.state.selected_operation_type.length === 1) {

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
                            display_part_unique.push([])
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
                    let combined_unique_display_parts = []

                    for (let j = 0; j < same_stock_move_locations_indexes.length; j++) {
                        // closeIsSelect function to close selected items
                        if (j === same_stock_move_locations_indexes.length - 1) {
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        } else {
                            this.closeAllSelectedLines(display_parts[same_stock_move_locations_indexes[j]])
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        }
                        // combine products in display unique field
                        for (let h = 0; h < display_part_unique[same_stock_move_locations_indexes[j]].length; h++) {
                            let unique_inventory_line = display_part_unique[same_stock_move_locations_indexes[j]][h]

                            let indexes_of_scanned_inventory_line = [];
                            combined_unique_display_parts.forEach((inventory_line, index) => {
                                if (unique_inventory_line.data.product_id === inventory_line.data.product_id) {
                                    indexes_of_scanned_inventory_line.push(index)
                                }
                            })

                            if (indexes_of_scanned_inventory_line.length === 1) {

                                let inventory_line = combined_unique_display_parts[indexes_of_scanned_inventory_line[0]]
                                inventory_line.data.quantity += unique_inventory_line.data.quantity
                                inventory_line.is_selected = false

                            } else if (indexes_of_scanned_inventory_line.length === 0) {
                                combined_unique_display_parts.push(unique_inventory_line)
                                this.display_part_unique_id++
                            }
                        }

                    }
                    for (let k = 0; k < same_stock_move_locations_indexes.length; k++) {
                        if (k !== 0) {
                            display_parts.splice(same_stock_move_locations_indexes[k], 1)
                            src_locations.splice(same_stock_move_locations_indexes[k], 1)
                            dest_locations.splice(same_stock_move_locations_indexes[k], 1)
                            display_part_unique.splice(same_stock_move_locations_indexes[k], 1)
                        }
                    }
                    display_parts[same_stock_move_locations_indexes[0]] = combined_display_parts
                    display_part_unique[same_stock_move_locations_indexes[0]] = combined_unique_display_parts
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
                                    display_part_unique.push([])
                                    src_locations.push([location[0], location[1], false])
                                    current_page = display_parts.length
                                    total_pages++
                                }
                            }
                        }

                    } else if (!src_locations[src_locations.length - 1]) {
                        this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                            title: "Error",
                            type: "danger",
                        })
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
                                    display_part_unique.push([])
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
        this.display_parts_list_unique = [...display_part_unique]
        this.state.display_parts = [...display_parts]
        this.state.source_locations = [...src_locations]
        this.state.dest_locations = [...dest_locations]
        this.state.current_page = current_page
        this.state.total_pages = total_pages

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
    array_includes = function (array_parent, array) {
        for (var i = 0; i < array_parent.length; i++) {
            if (array_parent[i][0] === array[0] && array_parent[i][1] === array[1]) {
                return true
            }
        }
        return false;
    }


    selectSrcLocation = (location) => {
        let selected_operation_type = [...this.state.selected_operation_type]
        let display_parts = [...this.display_parts_list]
        let display_part_unique = [...this.display_parts_list_unique]
        let dest_locations = [...this.state.dest_locations]
        let src_locations = [...this.state.source_locations]
        let current_page = this.state.current_page
        let total_pages = this.state.total_pages

        if (this.state.selected_operation_type.length === 1) {

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
                    let combined_unique_display_parts = []

                    for (let j = 0; j < same_stock_move_locations_indexes.length; j++) {
                        // closeIsSelect function to close selected items
                        if (j === same_stock_move_locations_indexes.length - 1) {
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        } else {
                            this.closeAllSelectedLines(display_parts[same_stock_move_locations_indexes[j]])
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        }
                        // combine products in display unique field
                        for (let h = 0; h < display_part_unique[same_stock_move_locations_indexes[j]].length; h++) {
                            let unique_inventory_line = display_part_unique[same_stock_move_locations_indexes[j]][h]

                            let indexes_of_scanned_inventory_line = [];
                            combined_unique_display_parts.forEach((inventory_line, index) => {
                                if (unique_inventory_line.data.product_id === inventory_line.data.product_id) {
                                    indexes_of_scanned_inventory_line.push(index)
                                }
                            })

                            if (indexes_of_scanned_inventory_line.length === 1) {

                                let inventory_line = combined_unique_display_parts[indexes_of_scanned_inventory_line[0]]
                                inventory_line.data.quantity += unique_inventory_line.data.quantity
                                inventory_line.is_selected = false

                            } else if (indexes_of_scanned_inventory_line.length === 0) {
                                combined_unique_display_parts.push(unique_inventory_line)
                                this.display_part_unique_id++
                            }
                        }

                    }
                    for (let k = 0; k < same_stock_move_locations_indexes.length; k++) {
                        if (k !== 0) {
                            display_parts.splice(same_stock_move_locations_indexes[k], 1)
                            src_locations.splice(same_stock_move_locations_indexes[k], 1)
                            dest_locations.splice(same_stock_move_locations_indexes[k], 1)
                            display_part_unique.splice(same_stock_move_locations_indexes[k], 1)
                        }
                    }
                    display_parts[same_stock_move_locations_indexes[0]] = combined_display_parts
                    display_part_unique[same_stock_move_locations_indexes[0]] = combined_unique_display_parts
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
        this.display_parts_list_unique = [...display_part_unique]
        this.state.display_parts = [...display_parts]
        this.state.source_locations = [...src_locations]
        this.state.dest_locations = [...dest_locations]
        this.state.current_page = current_page
        this.state.total_pages = total_pages
        console.log(this.display_parts_list_unique)
    }

    selectDestLocation = (location) => {

        let selected_operation_type = [...this.state.selected_operation_type]
        let display_parts = [...this.display_parts_list]
        let display_part_unique = [...this.display_parts_list_unique]
        let dest_locations = [...this.state.dest_locations]
        let src_locations = [...this.state.source_locations]
        let current_page = this.state.current_page
        let total_pages = this.state.total_pages

        if (this.state.selected_operation_type.length === 1) {

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
                    let combined_unique_display_parts = []

                    for (let j = 0; j < same_stock_move_locations_indexes.length; j++) {
                        // closeIsSelect function to close selected items
                        if (j === same_stock_move_locations_indexes.length - 1) {
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        } else {
                            this.closeAllSelectedLines(display_parts[same_stock_move_locations_indexes[j]])
                            combined_display_parts.unshift(...display_parts[same_stock_move_locations_indexes[j]])
                        }
                        // combine products in display unique field
                        for (let h = 0; h < display_part_unique[same_stock_move_locations_indexes[j]].length; h++) {
                            let unique_inventory_line = display_part_unique[same_stock_move_locations_indexes[j]][h]

                            let indexes_of_scanned_inventory_line = [];
                            combined_unique_display_parts.forEach((inventory_line, index) => {
                                if (unique_inventory_line.data.product_id === inventory_line.data.product_id) {
                                    indexes_of_scanned_inventory_line.push(index)
                                }
                            })

                            if (indexes_of_scanned_inventory_line.length === 1) {

                                let inventory_line = combined_unique_display_parts[indexes_of_scanned_inventory_line[0]]
                                inventory_line.data.quantity += unique_inventory_line.data.quantity
                                inventory_line.is_selected = false

                            } else if (indexes_of_scanned_inventory_line.length === 0) {
                                combined_unique_display_parts.push(unique_inventory_line)
                                this.display_part_unique_id++
                            }
                        }

                    }
                    for (let k = 0; k < same_stock_move_locations_indexes.length; k++) {
                        if (k !== 0) {
                            display_parts.splice(same_stock_move_locations_indexes[k], 1)
                            src_locations.splice(same_stock_move_locations_indexes[k], 1)
                            dest_locations.splice(same_stock_move_locations_indexes[k], 1)
                            display_part_unique.splice(same_stock_move_locations_indexes[k], 1)
                        }
                    }
                    display_parts[same_stock_move_locations_indexes[0]] = combined_display_parts
                    display_part_unique[same_stock_move_locations_indexes[0]] = combined_unique_display_parts
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

                    dest_unique_locations.forEach((src_unique_location) => {
                        let same_dest_locations_indexes = []
                        dest_location_ids.forEach((src_location, index) => {
                            if (src_unique_location === src_location) {
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
        this.display_parts_list_unique = [...display_part_unique]
        this.state.display_parts = [...display_parts]
        this.state.source_locations = [...src_locations]
        this.state.dest_locations = [...dest_locations]
        this.state.current_page = current_page
        this.state.total_pages = total_pages
        console.log(this.display_parts_list_unique)
    }

    scan1(barcode) {
        this.mutex.exec(async () => {
            await this.scan(barcode);
        })
    }

    imageUrl(id, write_date) {
        return `/web/image?model=product.product&field=image_128&id=${id}&write_date=${write_date}&unique=1`;
    }

    scan = async (barcode) => {
        let data = await this.getScanData(barcode)
        let scanned_part = data.product_data
        let scanned_location = data.location_data
        let scanned_operation_type = data.operation_type_data

        await this.addScannedDetails(scanned_part, scanned_location, scanned_operation_type)
    }


    addScannedDetails = async (scanned_part, scanned_location, scanned_operation_type) => {

        if (scanned_part.length === 1) {
            this.addToDisplayParts(scanned_part, 1);

        } else if (scanned_location.length === 1) {
            this.selectScannedLocation([scanned_location[0].id, scanned_location[0].display_name])

        } else if (scanned_operation_type.length === 1) {
            await this.selectOperationType(...scanned_operation_type)
        } else if (scanned_part.length === 0 && scanned_location.length === 0 && scanned_operation_type.length === 0) {
            this.notificationService.add("Error,Barcode not found", {
                title: "Error",
                type: "danger",
            })
            this.onPlaySound('error')

        } else if (scanned_part.length >= 1 || scanned_location.length >= 1 || scanned_operation_type.length >= 1) {
            this.notificationService.add("Error,A bug detected. Please Contact the developer", {
                title: "Error",
                type: "danger",
            })
        }
    }

// display_parts:[[{product:part1 ,qty:qty },{product:part1 ,qty:qty }] , [{product:part1 ,qty:qty },{product:part1 ,qty:qty }]]
    // {
    //     id: this.line_id,
    //     is_selected: true,
    //     data: {
    //         product_id: scanned_part[0].id,
    //         display_name: scanned_part[0].display_name,
    //         quantity: 0,
    //         weight:
    //     }
    // }
    addToDisplayParts = (scanned_part, quantity) => {
        let current_page = this.state.current_page
        let selected_operation_type = [...this.state.selected_operation_type]
        let display_parts = [...this.display_parts_list]
        let display_parts_unique = [...this.display_parts_list_unique]
        let dest_locations = [...this.state.dest_locations]
        let src_locations = [...this.state.source_locations]
        let total_pages = this.state.total_pages

        if (this.state.selected_operation_type.length === 1) {
            if (scanned_part[0].tracking === 'none') {
                if (display_parts.length > 0) {
                    if (display_parts[current_page - 1].length === 0) {
                        display_parts[current_page - 1] = this.closeAllSelectedLines(display_parts[current_page - 1])
                        display_parts[current_page - 1].unshift({

                            id: this.display_part_id,
                            is_selected: true,
                            data: {
                                product_id: scanned_part[0].id,
                                write_date: scanned_part[0].write_date,
                                default_code: scanned_part[0].default_code,
                                display_name: scanned_part[0].display_name,
                                quantity: quantity,
                                hq_qty: scanned_part[0].hq_qty,
                                virtual_available: scanned_part[0].virtual_available,
                                weight: scanned_part[0].weight,
                                uom_id: scanned_part[0].uom_id[0]
                            }

                        })
                        this.display_part_id++
                    } else if (display_parts[current_page - 1].length > 0) {
                        if (display_parts[current_page - 1][0].data.product_id === scanned_part[0].id) {
                            display_parts[current_page - 1] = this.closeAllSelectedLines(display_parts[current_page - 1])
                            display_parts[current_page - 1][0].data.quantity = display_parts[current_page - 1][0].data.quantity + quantity
                            display_parts[current_page - 1][0].is_selected = true
                        } else {
                            display_parts[current_page - 1] = this.closeAllSelectedLines(display_parts[current_page - 1])
                            display_parts[current_page - 1].unshift({
                                id: this.display_part_id,
                                is_selected: true,
                                data: {
                                    product_id: scanned_part[0].id,
                                    write_date: scanned_part[0].write_date,
                                    default_code: scanned_part[0].default_code,
                                    display_name: scanned_part[0].display_name,
                                    quantity: quantity,
                                    hq_qty: scanned_part[0].hq_qty,
                                    virtual_available: scanned_part[0].virtual_available,
                                    weight: scanned_part[0].weight,
                                    uom_id: scanned_part[0].uom_id[0]
                                }
                            })
                            this.display_part_id++
                        }
                    }
                }
                if (display_parts_unique.length > 0) {
                    if (display_parts_unique[current_page - 1].length === 0) {
                        display_parts_unique[current_page - 1].push({

                            id: this.display_part_unique_id,
                            is_selected: false,
                            data: {
                                product_id: scanned_part[0].id,
                                write_date: scanned_part[0].write_date,
                                default_code: scanned_part[0].default_code,
                                display_name: scanned_part[0].display_name,
                                quantity: quantity,
                                hq_qty: scanned_part[0].hq_qty,
                                virtual_available: scanned_part[0].virtual_available,
                                weight: scanned_part[0].weight,
                                uom_id: scanned_part[0].uom_id[0]
                            }

                        })
                        this.display_part_unique_id++
                    } else if (display_parts_unique[current_page - 1].length > 0) {
                        let indexes_of_scanned_inventory_line = [];
                        display_parts_unique[current_page - 1].forEach((inventory_line, index) => {
                            if (scanned_part[0].id === inventory_line.data.product_id) {
                                indexes_of_scanned_inventory_line.push(index)
                            }
                        })

                        if (indexes_of_scanned_inventory_line.length === 1) {

                            let inventory_line = display_parts_unique[current_page - 1][indexes_of_scanned_inventory_line[0]]
                            inventory_line.data.quantity += quantity
                            inventory_line.is_selected = false

                        } else if (indexes_of_scanned_inventory_line.length === 0) {
                            display_parts_unique[current_page - 1].push({
                                id: this.display_part_unique_id,
                                is_selected: false,
                                data: {
                                    product_id: scanned_part[0].id,
                                    write_date: scanned_part[0].write_date,
                                    default_code: scanned_part[0].default_code,
                                    display_name: scanned_part[0].display_name,
                                    quantity: quantity,
                                    hq_qty: scanned_part[0].hq_qty,
                                    virtual_available: scanned_part[0].virtual_available,
                                    weight: scanned_part[0].weight,
                                    uom_id: scanned_part[0].uom_id[0]
                                }
                            })
                            this.display_part_unique_id++
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

        } else {
            this.notificationService.add("Please scan or select operation type", {
                title: "Error",
                type: "danger",
            })
            this.onPlaySound('error')
        }

        this.display_parts_list = [...display_parts]
        this.display_parts_list_unique = [...display_parts_unique]
        this.state.sort_by = 'order'
        this.state.display_parts = [...display_parts]
        this.state.source_locations = [...src_locations]
        this.state.dest_locations = [...dest_locations]
    }


    removeProduct = (inventory_line) => {

        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let display_parts_unique = [...this.display_parts_list_unique[current_page - 1]]
        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })

        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {
            display_parts_list_copy[selected_inventory_line_id_index].data.quantity = 0

        }
        if (display_parts_unique.length > 0) {
            let indexes_of_scanned_inventory_line = [];
            display_parts_unique.forEach((inventory_line_unique, index) => {
                if (inventory_line.data.product_id === inventory_line_unique.data.product_id) {
                    indexes_of_scanned_inventory_line.push(index)
                }
            })

            if (indexes_of_scanned_inventory_line.length === 1) {

                let inventory_line = display_parts_unique[indexes_of_scanned_inventory_line[0]]
                inventory_line.data.quantity = 0
            }
        }

        this.display_parts_list_unique[current_page - 1] = [...display_parts_unique]
        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]
    }

    handleClickPlus = (inventory_line) => {

        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let display_parts_unique = [...this.display_parts_list_unique[current_page - 1]]
        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })

        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {
            display_parts_list_copy[selected_inventory_line_id_index].data.quantity += 1

        }
        if (display_parts_unique.length > 0) {
            let indexes_of_scanned_inventory_line = [];
            display_parts_unique.forEach((inventory_line_unique, index) => {
                if (inventory_line.data.product_id === inventory_line_unique.data.product_id) {
                    indexes_of_scanned_inventory_line.push(index)
                }
            })

            if (indexes_of_scanned_inventory_line.length === 1) {

                let inventory_line = display_parts_unique[indexes_of_scanned_inventory_line[0]]
                inventory_line.data.quantity += 1
            }
        }

        this.display_parts_list_unique[current_page - 1] = [...display_parts_unique]
        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]

    }
    handleClickMinus = (inventory_line) => {

        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let display_parts_unique = [...this.display_parts_list_unique[current_page - 1]]
        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })

        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {
            if (display_parts_list_copy[selected_inventory_line_id_index].data.quantity > 0) {
                display_parts_list_copy[selected_inventory_line_id_index].data.quantity -= 1
            }

        }
        if (display_parts_unique.length > 0) {
            let indexes_of_scanned_inventory_line = [];
            display_parts_unique.forEach((inventory_line_unique, index) => {
                if (inventory_line.data.product_id === inventory_line_unique.data.product_id) {
                    indexes_of_scanned_inventory_line.push(index)
                }
            })

            if (indexes_of_scanned_inventory_line.length === 1) {

                let inventory_line = display_parts_unique[indexes_of_scanned_inventory_line[0]]
                if (inventory_line.data.quantity > 0) {
                    inventory_line.data.quantity -= 1
                }
            }
        }

        this.display_parts_list_unique[current_page - 1] = [...display_parts_unique]
        this.display_parts_list[current_page - 1] = [...display_parts_list_copy]
        this.state.display_parts[current_page - 1] = [...display_parts_list_copy]

    }
    selectSortBy = async (sort_by) => {
        let display_parts_unique = [...this.display_parts_list_unique]
        if (sort_by === 'name') {
            for (let i = 0; i < display_parts_unique.length; i++) {
                display_parts_unique[i].sort(function (a, b) {
                    let x = a.data.display_name.toLowerCase();
                    let y = b.data.display_name.toLowerCase();
                    if (x < y) {
                        return -1;
                    }
                    if (x > y) {
                        return 1;
                    }
                    return 0;
                });
            }
            this.state.display_parts = [...display_parts_unique]
            this.display_parts_list_unique = [...display_parts_unique]
        }
        if (sort_by === 'internal_reference') {
            for (let i = 0; i < display_parts_unique.length; i++) {
                display_parts_unique[i].sort(function (a, b) {
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
            this.state.display_parts = [...display_parts_unique]
            this.display_parts_list_unique = [...display_parts_unique]
        }
        if (sort_by === 'quantity') {
            for (let i = 0; i < display_parts_unique.length; i++) {
                display_parts_unique[i].sort(function (a, b) {
                    return a.data.quantity - b.data.quantity
                });
            }
            this.state.display_parts = [...display_parts_unique]
            this.display_parts_list_unique = [...display_parts_unique]
        }
        if (sort_by === 'weight') {
            for (let i = 0; i < display_parts_unique.length; i++) {
                display_parts_unique[i].sort(function (a, b) {
                    return a.data.weight - b.data.weight
                });
            }
            this.state.display_parts = [...display_parts_unique]
            this.display_parts_list_unique = [...display_parts_unique]
        }
        if (sort_by === 'order') {
            this.state.display_parts = [...this.display_parts_list]
            this.display_parts_list_unique = [...display_parts_unique]
        }

        this.state.sort_by = sort_by

    }


    changeIsSelect = (inventory_line) => {

        let current_page = this.state.current_page
        // let selected_line_index = [];
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]

        for (let i = 0; i < display_parts_list_copy.length; i++) {
            if (display_parts_list_copy[i].id === inventory_line.id) {
                // selected_line_index.push(i)
                display_parts_list_copy[i].is_selected = true
            } else {
                display_parts_list_copy[i].is_selected = false
            }

        }
        // display_parts_list_copy[selected_line_index[0]].is_selected = true
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
    confirmButton = (display_value) => {
        this.confirmChange(this.edit_popup_part, display_value)
    }


    confirmChange = (inventory_line, scanned_amount) => {


        let current_page = this.state.current_page
        let display_parts_list_copy = [...this.display_parts_list[current_page - 1]]
        let display_parts_unique = [...this.display_parts_list_unique[current_page - 1]]
        let selected_inventory_line_id_index;
        this.display_parts_list[current_page - 1].forEach((inventory_line_display_part, index) => {
            if (inventory_line.id === inventory_line_display_part.id) {
                selected_inventory_line_id_index = index
            }
        })

        if (display_parts_list_copy[selected_inventory_line_id_index].id === inventory_line.id) {
            display_parts_list_copy[selected_inventory_line_id_index].data.quantity = parseInt(scanned_amount)

        }
        if (display_parts_unique.length > 0) {
            let indexes_of_scanned_inventory_line = [];
            display_parts_unique.forEach((inventory_line_unique, index) => {
                if (inventory_line.data.product_id === inventory_line_unique.data.product_id) {
                    indexes_of_scanned_inventory_line.push(index)
                }
            })

            if (indexes_of_scanned_inventory_line.length === 1) {

                let inventory_line = display_parts_unique[indexes_of_scanned_inventory_line[0]]
                inventory_line.data.quantity = parseInt(scanned_amount)
                inventory_line.is_selected = false
            }
        }


        this.state.add_products_popup = false
        this.state.edit_popup = false
        this.state.scanning_display = true
    }
    addLocationPopup = async () => {
        this.state.add_location_popup = true
        this.locations.locations_list = await this.orm.searchRead("stock.location", [], [], {limit: 100})
    }
    backLocationPopup = () => {
        this.state.add_location_popup = false
    }

    editPopup = async (inventory_line) => {
        this.edit_popup_part = inventory_line
        Object.assign(this.state, {add_products_popup: false, edit_popup: true, scanning_display: false})


    }
    backButtonEditPopUp = () => {
        Object.assign(this.state, {add_products_popup: false, edit_popup: false, scanning_display: true})
    }

    backButtonPopup = () => {
        this.state.back_popup = true
    }
    discardBackButtonPopup = () => {
        this.state.back_popup = false
    }

    backButtonClick() {
//        const barcode = useService("barcode");
//        useBus(barcode.bus, 'barcode_scanned', (ev) => this.scan1(ev.detail.barcode));
        //core.bus.off('barcode_scanned', this, this.scan1);
        if (this.env.config.breadcrumbs.length > 0) {
            //this.actionService.restore();
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

    validatePopUp = () => {
        this.state.validate_popup = true
    }
    discardValidatePopUp = () => {
        this.state.validate_popup = false
    }
    applyTransfer = async () => {
        await this.validateTransferPrepareLines()
        this.state.validate_popup = false
        this.backButtonClick()

    }
    applyValidateTransfer = async () => {
        let record_id = await this.validateTransferPrepareLines()
        await this.orm.call("stock.picking", "button_validate", [record_id], {})
        this.state.validate_popup = false
        this.backButtonClick()
    }


    validateTransferPrepareLines = async () => {

        let display_parts_complex = this.state.display_parts
        let src_locations = this.state.source_locations
        let dest_locations = this.state.dest_locations
        let prepared_part_list = []
        let done_part_list = []
        let selected_operation_type = [...this.state.selected_operation_type]
        let stock_move_line_ids_done


        if (this.state.selected_operation_type.length === 1) {

            if (selected_operation_type[0].default_location_src_id && selected_operation_type[0].default_location_dest_id) {
                for (let i = 0; i < display_parts_complex.length; i++) {
                    let display_parts = display_parts_complex[i]
                    let src_location_id = src_locations[i][0]
                    let dest_location_id = dest_locations[i][0]
                    let unique_part_ids = []
                    display_parts.forEach((inventory_line) => {
                        if (!unique_part_ids.includes(inventory_line.data.product_id) && inventory_line.data.quantity > 0) {
                            unique_part_ids.push(inventory_line.data.product_id)
                        }
                    })

                    let part_list = unique_part_ids.map((unique_product_id) => {
                        let product;
                        let part_qty = 0
                        display_parts.forEach((display_part) => {
                            if (unique_product_id === display_part.data.product_id) {
                                product = display_part.data
                                part_qty = part_qty + display_part.data.quantity
                            }
                        })
                        return {
                            part_id: product.product_id,
                            product_uom_id: product.uom_id,
                            qty: part_qty,
                            src_location: src_location_id,
                            dest_location: dest_location_id
                        }
                    })

                    done_part_list = prepared_part_list.concat(part_list)
                    prepared_part_list = done_part_list
                }

                let stock_move_line_ids = prepared_part_list.map((part) => {
                    let vals = {
                        location_dest_id: part.dest_location,
                        location_id: part.src_location,
                        product_id: part.part_id,
                        product_uom_id: part.product_uom_id,
                        qty_done: part.qty,
                        reserved_uom_qty:part.qty,
                        owner_id: false,
                        lot_id: false,
                        lot_name: false,
                        package_id: false,
                    }
                    return [0, 0, vals]

                })
                stock_move_line_ids_done = stock_move_line_ids
            } else if (selected_operation_type[0].default_location_src_id && !selected_operation_type[0].default_location_dest_id) {
                for (let i = 0; i < display_parts_complex.length; i++) {
                    let display_parts = display_parts_complex[i]
                    let src_location_id = src_locations[i][0]
                    let unique_part_ids = []
                    display_parts.forEach((inventory_line) => {
                        if (!unique_part_ids.includes(inventory_line.data.product_id)) {
                            unique_part_ids.push(inventory_line.data.product_id)
                        }
                    })

                    let part_list = unique_part_ids.map((unique_product_id) => {
                        let product;
                        let part_qty = 0
                        display_parts.forEach((display_part) => {
                            if (unique_product_id === display_part.data.product_id) {
                                product = display_part.data
                                part_qty = part_qty + display_part.data.quantity
                            }
                        })
                        return {
                            part_id: product.product_id,
                            product_uom_id: product.uom_id,
                            qty: part_qty,
                            src_location: src_location_id,
                            dest_location: this.dest_location_default
                        }
                    })

                    done_part_list = prepared_part_list.concat(part_list)
                    prepared_part_list = done_part_list
                }

                let stock_move_line_ids = prepared_part_list.map((part) => {
                    let vals = {
                        location_dest_id: this.dest_location_default,
                        location_id: part.src_location,
                        product_id: part.part_id,
                        product_uom_id: part.product_uom_id,
                        qty_done: part.qty,
                        reserved_uom_qty:part.qty,
                        owner_id: false,
                        lot_id: false,
                        lot_name: false,
                        package_id: false,
                    }
                    return [0, 0, vals]

                })
                stock_move_line_ids_done = stock_move_line_ids

            } else if (!selected_operation_type[0].default_location_src_id && selected_operation_type[0].default_location_dest_id) {
                for (let i = 0; i < display_parts_complex.length; i++) {
                    let display_parts = display_parts_complex[i]
                    let dest_location_id = dest_locations[i][0]
                    let unique_part_ids = []
                    display_parts.forEach((inventory_line) => {
                        if (!unique_part_ids.includes(inventory_line.data.product_id) && inventory_line.data.quantity > 0) {
                            unique_part_ids.push(inventory_line.data.product_id)
                        }
                    })

                    let part_list = unique_part_ids.map((unique_product_id) => {
                        let product;
                        let part_qty = 0
                        display_parts.forEach((display_part) => {
                            if (unique_product_id === display_part.data.product_id) {
                                product = display_part.data
                                part_qty = part_qty + display_part.data.quantity
                            }
                        })
                        return {
                            part_id: product.product_id,
                            product_uom_id: product.uom_id,
                            qty: part_qty,
                            src_location: this.source_location_default,
                            dest_location: dest_location_id
                        }
                    })

                    done_part_list = prepared_part_list.concat(part_list)
                    prepared_part_list = done_part_list
                }


                let stock_move_line_ids = prepared_part_list.map((part) => {
                    let vals = {
                        location_dest_id: part.dest_location,
                        location_id: this.source_location_default,
                        product_id: part.part_id,
                        product_uom_id: part.product_uom_id,
                        qty_done: part.qty,
                        reserved_uom_qty:part.qty,
                        owner_id: false,
                        lot_id: false,
                        lot_name: false,
                        package_id: false,
                    }
                    return [0, 0, vals]

                })
                stock_move_line_ids_done = stock_move_line_ids
            }

        }


        let param = {
            location_id: this.source_location_default,
            location_dest_id: this.dest_location_default,
            picking_type_id: this.state.selected_operation_type[0].id,
//            immediate_transfer: true,
            move_line_ids: stock_move_line_ids_done,
        }

        let record = await this.orm.create("stock.picking", [param])
        return record

    }


    addProductPopup = () => {
        Object.assign(this.state, {add_products_popup: true, edit_popup: false, scanning_display: false})
    }
    backButtonAddProductPopup = () => {
        Object.assign(this.state, {add_products_popup: false, edit_popup: false, scanning_display: true})
    }

    addProduct = (selected_part, quantity) => {
        this.addToDisplayParts([selected_part], quantity)
    }

    getStockOperationTypeData = async (operation_type_id) => {

        let data = await this.rpcService(`/web/dataset/call_kw/stock.operation.data.prepare/get_stock_operation_type_data`, {
            model: 'stock.operation.data.prepare',
            method: 'get_stock_operation_type_data',
            args: [[], operation_type_id],
            kwargs: {}
            //context: {},
        });
        return data
    }
    getScanData = async (barcode) => {
        let data = await this.rpcService(`/web/dataset/call_kw/stock.operation.data.prepare/scan_get_data`, {
            model: 'stock.operation.data.prepare',
            method: 'scan_get_data',
            args: [[], barcode],
            kwargs: {}
            //context: {},
        });
        return data
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

export class SortBy extends Component {
    setup() {
        this.state = useState({list_visible: false})
        useExternalListener(window, "click", this.onWindowClicked);
        this.rootRef = useRef("root_sort_by");
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

export class BarcodeLineTransferUnique extends Component {

}

export class BarcodeLineTransfer extends Component {
    constructor() {
        super(...arguments);
    }
}


ScanningDisplay.components = {
    EditPopUpComponent,
    SelectDropDown,
    AddProductsPopUp,
    SortBy,
    BarcodeLineTransfer,
    BarcodeLineTransferUnique,
    SelectAddDropDownLocation,
    SelectDropDownLocationSrc,
    SelectDropDownLocationDest,

};
BarcodeLineTransferUnique.template = "custom_barcode_app.BarcodeLineTransferUnique"
BarcodeLineTransfer.template = "custom_barcode_app.BarcodeLineTransfer"
ScanningDisplay.template = "custom_barcode_app.ScanningDisplay"
SortBy.template = "custom_barcode_app.SortBy"
registry.category("actions").add('create_transfer', ScanningDisplay);


