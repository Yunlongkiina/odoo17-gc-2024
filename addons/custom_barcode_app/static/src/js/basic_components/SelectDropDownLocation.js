/** @odoo-module **/


const {Component,useState, useExternalListener,useEffect,useRef} = owl;
import {useService } from "@web/core/utils/hooks";
export class SelectDropDownLocationSrc extends Component {


    setup() {
        this.state = useState({ list_visible:false})
        useExternalListener(window, "click", this.onWindowClicked);
        this.rootRef = useRef("root_select_src_location");
        //         this.ui = useService("ui");
        // useEffect(
        //     () => {
        //         Promise.resolve().then(() => {
        //             this.myActiveEl = this.ui.activeElement;
        //         });
        //     },
        //     () => []
        // );
    }


    handleListClick=(selected_item)=>{

        Object.assign(this.state, {list_visible:false})
        this.props.select_action(selected_item)
    }
    clickDropDown=()=>{

        if(this.state.list_visible){
            this.state.list_visible=false
        }
        else{
            this.state.list_visible=true
        }
    }
        onWindowClicked(ev) {

        // Return if already closed
        if (!this.state.list_visible) {
            return;
        }
        // Return if it's a different ui active element
        // if (this.ui.activeElement !== this.myActiveEl) {
        //
        //     return;
        // }
        // Close if we clicked outside the dropdown, or outside the parent
        // element if it is the toggler
        const rootEl = this.rootRef.el;
        const gotClickedInside = rootEl.contains(ev.target);
        if (!gotClickedInside) {
            this.state.list_visible=false
        }

    }


}
export class SelectDropDownLocationDest extends Component {


    setup() {
        this.state = useState({ list_visible:false})
        useExternalListener(window, "click", this.onWindowClicked);
        this.rootRef = useRef("root_select_dest_location");
        //         this.ui = useService("ui");
        // useEffect(
        //     () => {
        //         Promise.resolve().then(() => {
        //             this.myActiveEl = this.ui.activeElement;
        //         });
        //     },
        //     () => []
        // );
    }


    handleListClick=(selected_item)=>{

        Object.assign(this.state, {list_visible:false})
        this.props.select_action(selected_item)
    }
    clickDropDown=()=>{

        if(this.state.list_visible){
            this.state.list_visible=false
        }
        else{
            this.state.list_visible=true
        }
    }
        onWindowClicked(ev) {

        // Return if already closed
        if (!this.state.list_visible) {
            return;
        }
        // Return if it's a different ui active element
        // if (this.ui.activeElement !== this.myActiveEl) {
        //
        //     return;
        // }
        // Close if we clicked outside the dropdown, or outside the parent
        // element if it is the toggler
        const rootEl = this.rootRef.el;
        const gotClickedInside = rootEl.contains(ev.target);
        if (!gotClickedInside) {
            this.state.list_visible=false
        }

    }


}
SelectDropDownLocationSrc.template = "custom_barcode_app.SelectDropDownLocationSrc"
SelectDropDownLocationDest.template = "custom_barcode_app.SelectDropDownLocationDest"