/** @odoo-module **/


const {Component, useState, useExternalListener, useEffect, useRef} = owl;
import {useService} from "@web/core/utils/hooks";

export class SelectDropDown extends Component {


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

    handleListClick = (selected_item) => {
        Object.assign(this.state, {list_visible: false})
        this.props.select_action(selected_item)
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

export class SelectAddDropDownLocation extends Component {


    setup() {
        this.state = useState({list_visible: false})
        useExternalListener(window, "click", this.onWindowClicked);
        this.rootRef = useRef("root_add_drop_down");
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
        this.props.select_action(selected_item)
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

        // Close if we clicked outside the dropdown, or outside the parent
        // element if it is the toggler
        const rootEl = this.rootRef.el;
        const gotClickedInside = rootEl.contains(ev.target);
        if (!gotClickedInside) {
            this.state.list_visible = false
        }

    }
}

SelectDropDown.template = "custom_barcode_app.SelectDropDown"
SelectAddDropDownLocation.template = "custom_barcode_app.SelectAddDropDownLocation"