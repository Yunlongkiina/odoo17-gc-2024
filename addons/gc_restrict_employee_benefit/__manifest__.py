# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    'name': 'gc_restrict_employee_benefit',
    'version': '17.1',
    'category': 'Point of Sale',
    'summary': 'Restrict Employee consume Employeee Pricelist more than current month limit amount',
    'description' :"""
        1: Set GC employee Pricelist in POS Session Setting
        2: Set Amount Limit in Contact
        3: In Pos Session, Select Customer, click Customer info to check Current customer current month amount info
        4: When click Payment, logic will start
    """,
    'author': 'Yunlong,Liu',
    'website': 'goldencrop.fi',
    'depends': ['base','sale', 'point_of_sale','contacts'],
    'data': [
        'security/restrict_employee_benefit_security.xml',
        'views/res_partner_view.xml',
        'views/pos_config_view.xml',
    ],
    'assets':{
        'point_of_sale._assets_pos': [
            'gc_restrict_employee_benefit/static/src/js/models.js',
            'gc_restrict_employee_benefit/static/src/js/ProductScreen.js',
            'gc_restrict_employee_benefit/static/src/js/ticket_screen.js',
            'gc_restrict_employee_benefit/static/src/js/customer_info_btn.js',
            'gc_restrict_employee_benefit/static/src/xml/customer_info_button_view.xml',
            'gc_restrict_employee_benefit/static/src/xml/refund_whole_order_button_view.xml',

         ],
    }   ,
    "auto_install": False,
    "installable": True,
    'license': 'OPL-1',
}
