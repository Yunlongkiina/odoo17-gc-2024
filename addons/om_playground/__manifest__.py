# -*- coding: utf-8 -*-

{
    'name': 'Odoo Mates Play Ground',
    'version': '1.0.0',
    'category': 'Tools',
    'sequence': '10',
    'live_test_url': '',
    'author': 'Odoo Mates',
    'company': 'Odoo Mates',
    'website': 'www.odoomates.tech',
    'maintainer': 'Odoo Mates',
    'summary': 'Odoo Mates Play Ground',
    'description': """Odoo Mates Play Ground""",
    'depends': ['base'],
    'data': [
        'security/ir.model.access.csv',
        'views/menu.xml',
        'views/odoo_playground_view.xml',
        'views/odoo_query_view.xml',
    ],
    'support': 'odoomates@gmail.com',
    'license': "AGPL-3",
    'price': 10.00,
    'currency': 'USD',
    'demo' :[],
    'application': False,
    'auto_install': False,
    'images': ['static/description/banner.gif'],
}
