{
    'name' : 'Barcode Scanner App',
    'version' : '17.0.0.0',
    'summary': 'Odoo Barcode App helps you to manage your inventory faster and accurately. Barcode Scan, Mobile Barcode Scanner, Inventory Barcode Scanner, Stock Barcode Scanner, Inventory Adjustment Barcode Scanner, Barcode Labels, Quotation, Inventory Adjustment, Warehouse, Warehouse Operation Stock Adjustment Barcode Scanner, Scan Barcode, Scan Internal Reference, Scan Barcode Product, Stock Adjustment, Stock Locations, Barcode App, Warehouse Stock Adjustment, Product Stock By Barcode, Product Inventory Details, Product Price List, Product Stock Details, Product Stock Details By Barcode ,Product Location Details, Product Barcode Scan, Barcode Scanner, Product Details, Product Quick Search, Warehouse Product Details, Product Stock In Warehouse, Product Stock In Location, Stocks by Locations, Sales Product Details, Sales Price List, Inventory Transfer, Create Inventory Transfer, Warehouse Operations, Receive Purchase Orders, Inventory Receipts, Delivery Orders, Internal Transfers, Operation Type',
    'sequence': 15,
    'description': "v17 Upgraded by Golden Crop. Inside your warehouse it is hard to enter items manually to create a transfer or to validate a purchase order delivery order etc. That is when the barcode scanning is come into play. If you can do all the work with barcodes it is much more easier and error free. So this is the ultimate solution.You can use this barcode app to create transfers, Validate warehouse operations, Inventory adjustments, View Product details.Refer to the tutoral for ore details",
    'category': 'Warehouse',
    'website': '',
    'author': 'JNK Technologies, Golden Crop',
    'images' : ["static/description/banner.gif"],
    "depends": ["web","sale", "sale_management","purchase","stock","barcodes"],
    "data":[
                "views/views.xml",
                'security/ir.model.access.csv',
             ],
    'assets': {

        "web.assets_backend": [
            "/custom_barcode_app/static/src/css/styles.css",
            "/custom_barcode_app/static/fonts/fonts.css",
            "/custom_barcode_app/static/fonts/lato_font.scss",
            "/custom_barcode_app/static/src/js/main_screen/MainScreen.css",
            "/custom_barcode_app/static/src/js/product_info_components/ProductDetails.css",
            "/custom_barcode_app/static/src/js/warehouse_operations/AddProductsPopUp.css",
            "/custom_barcode_app/static/src/js/warehouse_operations/WarehouseOperation.css",
            "/custom_barcode_app/static/src/js/inventory_adjustments/inventory_adjustment.css",
            "/custom_barcode_app/static/src/js/basic_components/basic_component.css",

            "/custom_barcode_app/static/src/js/main_screen/MainScreen.xml",
            "/custom_barcode_app/static/src/js/inventory_transfer_components/ScanningDisplay.xml",
            "/custom_barcode_app/static/src/js/product_info_components/ProductDetails.xml",
            "/custom_barcode_app/static/src/js/warehouse_operations/WarehouseOperationDisplay.xml",
            "/custom_barcode_app/static/src/js/inventory_transfer_components/EditPopUpComponent.xml",
            "/custom_barcode_app/static/src/js/warehouse_operations/WarehouseOperation.xml",
            "/custom_barcode_app/static/src/js/inventory_adjustments/InventoryAdjustments.xml",
            "/custom_barcode_app/static/src/js/basic_components/SelectDropDown.xml",
            "/custom_barcode_app/static/src/js/basic_components/SelectDropDownLocation.xml",
            "/custom_barcode_app/static/src/js/warehouse_operations/AddProductsPopUp.xml",

            "/custom_barcode_app/static/src/js/main_screen/MainScreen.js",
            "/custom_barcode_app/static/src/js/inventory_transfer_components/ScanningDisplay.js",
            "/custom_barcode_app/static/src/js/product_info_components/ProductDetails.js",
            "/custom_barcode_app/static/src/js/warehouse_operations/WarehouseOperationDisplay.js",
            "/custom_barcode_app/static/src/js/inventory_adjustments/InventoryAdjustments.js",
            "/custom_barcode_app/static/src/js/inventory_transfer_components/EditPopUpComponent.js",
            "/custom_barcode_app/static/src/js/warehouse_operations/WarehouseOperation.js",
            "/custom_barcode_app/static/src/js/basic_components/SelectDropDown.js",
            "/custom_barcode_app/static/src/js/basic_components/SelectDropDownLocation.js",
            "/custom_barcode_app/static/src/js/warehouse_operations/AddProductsPopUp.js",
        ],
    },
    'demo': [],
    'qweb': [],
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'OPL-1',
}
