# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    "name" : "Product Multiple Barcodes for POS",
    "version" : "2.0.1",
    "category" : "Point of Sale",
    'summary': 'Product Multi Barcode for Product multiple barcode for product barcode search product based on barcode pos multiple barcode point of sale multi barcode for pos multi barcode for point of sales multi barcode for pos barcode pos product barcode for pos',
    "description": """
    
   User can add multiple barcodes to product and can find product useing any of barcode added to product on point of sale, User can also search product using multiple barcodes on product search view and also on sale, purchase, customer invoice, vendor bill, delivery order, and receipt.
    
    """,
    "author": "BrowseInfo, Golden Crop",
    "website" : "",
    "price": 0,
    "currency": 'EUR',
    "depends" : ['web','base', 'point_of_sale','product_multiple_barcodes'],
    "data": [
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            "product_multiple_barcodes_for_pos/static/src/app/product/pos_store.js" ,
            "product_multiple_barcodes_for_pos/static/src/app/product/productscreen.js" ,
            "product_multiple_barcodes_for_pos/static/src/app/product/posdb.js" ,
        ],

    },

    "auto_install": False,
    "installable": True,
    "images":["static/description/Banner.gif"],
    'license': 'OPL-1',
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
