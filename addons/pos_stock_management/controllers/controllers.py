# -*- coding: utf-8 -*-
# from odoo import http


# class PosStockManagement(http.Controller):
#     @http.route('/pos_stock_management/pos_stock_management', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/pos_stock_management/pos_stock_management/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('pos_stock_management.listing', {
#             'root': '/pos_stock_management/pos_stock_management',
#             'objects': http.request.env['pos_stock_management.pos_stock_management'].search([]),
#         })

#     @http.route('/pos_stock_management/pos_stock_management/objects/<model("pos_stock_management.pos_stock_management"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('pos_stock_management.object', {
#             'object': obj
#         })

