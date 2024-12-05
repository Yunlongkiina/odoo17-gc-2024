# -*- coding: utf-8 -*-
{
    'name': "PoS Stock Management",

    'summary': "This module is used for syncing inventory info between three servers (Main database serer, middleware server, and Pos servers)",

    'description': """This module is used for syncing inventory info between three servers (Main database serer, middleware server, and Pos servers)""",

    'author': "Oy Golden Crop AB IT Yang Tuo",
    'website': "https://goldencrop.fi",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/15.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'stock_management',
    'version': '1.0.1',

    # any module necessary for this one to work correctly
    'depends': ['base', 'product', 'rsa_sync', 'stock'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/pos_stock_display.xml',
        'views/pos_location_config.xml',
        'views/cron.xml',
    ]
}

