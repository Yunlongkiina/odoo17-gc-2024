# -*- coding: utf-8 -*-
{
    'name': "Api Odoo15 Golden Cropp",
    'summary':
        """
        """,
    'description':
        """
        """,
    'author': "Liu.Yunlong@GoldenCrop",
    'website': "www.goldencrop.fi",

    'category': 'Tools',
    'version': '15.01',
    # Modules are necessary for this one to work correctly
    'depends': ['base', 'product','sale'],

    # always loaded
    'data': [
        "views/ir_model.xml",
        "views/res_users.xml",
        'security/ir.model.access.csv',
    ],
    'license':'OPL-1',
}
