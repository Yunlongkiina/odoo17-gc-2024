import functools
import logging
from odoo import http
from odoo import models, fields, api, _
from odoo.addons.api_odoo15_goldencrop.common import invalid_response, valid_response
from odoo.exceptions import AccessError
from odoo.http import request
from datetime import timedelta, time
import requests

_logger = logging.getLogger(__name__)

def validate_token(func):

    """Fix Postman call api return 403, session is None"""
    # from odoo.service import security as Sec
    # import odoo
    # def check_session(session, request):
    #     with odoo.registry(session.db).cursor() as cr:
    #         self = odoo.api.Environment(cr, session.uid, {})['res.users'].browse(session.uid)
    #         if session.sid and session.session_token and odoo.tools.misc.consteq(self._compute_session_token(session.sid), session.session_token):
    #             return True
    #         # self._invalidate_session_cache()
    #         return False
    # Sec.check_session = check_session

    @functools.wraps(func)
    def wrap(self, *args, **kwargs):
        """Wrap the function to validate the access token."""
        access_token = request.httprequest.headers.get("access-token")
        if not access_token:
            return invalid_response("access_token_not_found", "Missing access token in request header", 401)        
        access_token_data = (
            request.env["api.access_token"].sudo().search([("token", "=", access_token)], order="id DESC", limit=1)
        )

        if not access_token_data:
            return invalid_response("access_token", "Token seems to have expired or is invalid", 401)
        token_check = access_token_data.find_one_or_create_token(user_id=access_token_data.user_id.id)
        if token_check != access_token:
            return invalid_response("access_token", "Token seems to have expired or is invalid", 401)        
        request.session.uid = access_token_data.user_id.id
        request.update_env(user=access_token_data.user_id.id)
        return func(self, *args, **kwargs)
    return wrap

class APIController(http.Controller):
    def __init__(self):
        self._model = "ir.model"

    # Get productinfo
    @validate_token
    @http.route("/api/v17/productinfo/<pastdays>", type="http", auth="none", methods=["GET"], csrf=False)
    def get_productinfo(self,pastdays):
        response = {'Error': True, 'content': False}
        try:
            ndays_sale = self._compute_products_sale_count_n_days(past_days_int = int(pastdays),location_id_int=8)
            product_template_data = request.env['product.product'].sudo().search([
                ('active', '=', True),
                ('available_in_pos', '=', True)
            ]).mapped(lambda pro: {
                    'defaultCode':pro.default_code,
                    'productId':pro.id,
                    'destinationOnhand': round(pro.qty_available, 1),
                    'incomingQty': round(pro.incoming_qty, 1),
                    'productNdaysSale': ndays_sale.get(pro.id)['product_ndays_sale'] if pro.id in ndays_sale.keys() else 0,
            })
            
            if product_template_data:
                source_des_products_info = {item["defaultCode"]: item for item in product_template_data}
                response = {'Error': False, 'content': source_des_products_info}
        except Exception as e:
            _logger.debug(f'Unexpected Error on /api/v15/productinfo: {e}')
            response = {'Error': True, 'content': False}
        return valid_response(response)

    def _compute_products_sale_count_n_days(self,past_days_int = None,location_id_int=None):
            ## location_dest_id:5
            ## Partner Locations/Customers
            r = {}
            location_dest_id = 5
            date_from = fields.Datetime.to_string(
                fields.datetime.combine(fields.datetime.now() - timedelta(days=past_days_int), time.min))

            done_states = ['done']
            domain = [
                ('state', 'in', done_states),
                ('location_id', 'in', [location_id_int]),
                ('location_dest_id', 'in', [location_dest_id]),
                ('date', '>=', date_from),
                ]
            grouped_data = request.env['stock.move'].read_group(domain, ['product_qty:sum'], 'product_id')

            return {
                group['product_id'][0]: {
                    'product_ndays_sale': group['product_qty'],
                    'product_id': group['product_id'][0]
                } for group in grouped_data
            }

    # Create Internal Transfer
    @validate_token
    @http.route("/api/v17/internaltransfer", type="json", auth="none", methods=["POST"], csrf=False)
    def create_interal_transfer(self,**post):
        try:
            response = {'Error': True,'orderIsdone':False}
            result = http.request.params
            if result and result.get('content'):
                content_data =  result.get('content')
                move_line_ids = content_data.get('movelineIds')
                deslocation = content_data.get('deslocation')
                if "whespoo" in deslocation:
                    partner_id = 12
                    picking_type_id = 1
                    des_location_id = 8
                if move_line_ids:
                    stock_picking = request.env['stock.picking']
                    move_line_values = []

                    for line in move_line_ids:
                        product_obj = request.env['product.product'].browse(line.get('productId'))
                        move_line_values.append((0, 0, {
                            'product_id': product_obj.id,
                            'name':product_obj.name,
                            'product_uom_qty':line.get('replenishment'),
                            'product_uom': product_obj.uom_id.id,
                            'partner_id': partner_id,
                            'location_id': 4,
                            'location_dest_id':des_location_id
                        }))

                    # Create a new internal transfer
                    transfer_vals = {
                        'picking_type_id': picking_type_id,
                        'partner_id': partner_id,
                        'location_id': 4,
                        'location_dest_id': des_location_id,
                        'move_ids_without_package': move_line_values
                    }
                    transfer = stock_picking.create(transfer_vals)
                    transfer.action_confirm()

                    response = {'Error': False,'orderIsdone':True, 'transferid':transfer.id, 'transfername':transfer.name}
                else:
                    response = {'Error': True,'orderIsdone':False}
            else:
                response = {'Error': True,'orderIsdone':False}
        except Exception as e:
            response = {'Error': True,'orderIsdone':False}
        return response

    @http.route('/totalamount/pos', type='json', auth='user', methods=['POST'], website=True, csrf=False)
    def current_customer_limited_amount(self):
        result = http.request.params
        partner_id = result['partner_id']
        # testData = self.call_pos_api(partner_id)
        # print(f'***********Yunlong****${testData}******************')

        if partner_id:
            partner_obj = request.env['res.partner'].browse(partner_id)
            if partner_obj:
                total_amount = partner_obj.get_pos_amount_current_month()
            else:
                total_amount = False
        else:
            total_amount = False
        return {
                    'total_amount' : total_amount
                }



    @http.route('/create/pricelistitems', type='json', auth='user', methods=['POST'], website=True, csrf=False)
    #    data_to_create =  [
    #         {
    #             'compute_price': 'percentage', 
    #             'fixed_price': 0, 
    #             'percent_price': 10, 
    #             'base': 'list_price', 
    #             'price_discount': 0, 
    #             'price_surcharge': 0, 
    #             'price_round': 0, 
    #             'price_min_margin': 0, 
    #             'price_max_margin': 0, 
    #             'applied_on': '1_product', 
    #             'categ_id': None, 
    #             'product_tmpl_id': 28, 
    #             'product_id': None, 
    #             'min_quantity': 10, 
    #             'date_start': '2024-10-31 07:45:00', 
    #             'date_end': '2024-11-29 07:45:00', 
    #             'pricelist_id': 1, 
    #             'odoo15_pricelistitem_id': 26
    #         }, 
    #         {
    #             'compute_price': 'formula', 'fixed_price': 0, 'percent_price': 0, 
    #             'base': 'pricelist', 'base_pricelist_id': 3, 'price_discount': 0, 
    #             'price_surcharge': 0, 'price_round': 0, 'price_min_margin': 0, 'price_max_margin': 0, 'applied_on': '1_product', 'categ_id': None, 
    #             'product_tmpl_id': 18, 'product_id': None, 'min_quantity': 2, 'date_start': '2024-10-30 07:45:00', 'date_end': '2024-11-22 07:45:00', 
    #             'pricelist_id': 1, 'odoo15_pricelistitem_id': 27}, 
    #         {
    #             'compute_price': 'fixed', 'fixed_price': 23, 'percent_price': 0, 'base': 'list_price', 'price_discount': 0, 'price_surcharge': 0, 
    #             'price_round': 0, 'price_min_margin': 0, 'price_max_margin': 0, 'applied_on': '0_product_variant', 'categ_id': None, 
    #             'product_tmpl_id': 46, 'product_id': 56, 'min_quantity': 3, 'date_start': '2024-10-31 07:45:00', 'date_end': '2024-11-29 07:45:00', 
    #             'pricelist_id': 1, 'odoo15_pricelistitem_id': 28}
    # ]

    def crate_pricelistitem_from_odo15(self):
        result = http.request.params
        data_to_create = result
        for item in data_to_create:
            if 'base_pricelist_id' in item:
                item.update({'base_pricelist_id':self.find_pricelist_id_odoo17(item.get('base_pricelist_id'))})
            if item['categ_id']:
                item.update({'categ_id':self.find_cate_id_odoo17(item.get('categ_id'))})
            if item['product_tmpl_id']:
                item.update({'product_tmpl_id':self.find_pro_tem_id_odoo17(item.get('product_tmpl_id'))})
            if item['product_id']:
                item.update({'product_id':self.find_pro_pro_id_odoo17(item.get('product_id'))})
        request.env['product.pricelist.item'].create(data_to_create)
        return True
    
    def find_pricelist_id_odoo17(self, pricelist_id_odoo15_int= None):
        pricelist_id_odoo17_int = request.env['product.pricelist'].search([('odoo15_pricelist_id','=',pricelist_id_odoo15_int)]).id if request.env['product.pricelist'].search([('odoo15_pricelist_id','=',pricelist_id_odoo15_int)]) else False
        return pricelist_id_odoo17_int

    def find_cate_id_odoo17(self, cate_id_odoo15_int= None):
        cate_id_odoo17_int = None

        return cate_id_odoo17_int

    def find_pro_tem_id_odoo17(self, pro_tem_id_odoo15_int= None):
        pro_tem_id_odoo17_int = None

        return pro_tem_id_odoo17_int

    def find_pro_pro_id_odoo17(self, pro_pro_id_odoo15_int= None):
        pro_pro_id_odoo17_int = None

        return pro_pro_id_odoo17_int

@http.route('/update/pricelistitem', type='json', auth='user', methods=['POST'], website=True, csrf=False)
# data_to_update = {
#     'fixed_price': 4, 
#     'min_quantity': 5, 
#     'date_start': '2024-10-30 08:35:00', 
#     'date_end': '2024-11-21 08:35:00', 
#     'odoo15_pricelistitem_id': 6
# }
def update_pricelistitem_from_odo15(self,**post):
        result = http.request.params
        data_to_update = result
        pricelis_item_obj_odoo17 = request.env['product.pricelist.item'].browse(data_to_update.get('odoo15_pricelistitem_id'))

        if 'base_pricelist_id' in data_to_update:
            data_to_update.update({'base_pricelist_id':self.find_pricelist_id_odoo17(data_to_update.get('base_pricelist_id'))})
        if data_to_update['categ_id']:
            data_to_update.update({'categ_id':self.find_cate_id_odoo17(data_to_update.get('categ_id'))})
        if data_to_update['product_tmpl_id']:
            data_to_update.update({'product_tmpl_id':self.find_pro_tem_id_odoo17(data_to_update.get('product_tmpl_id'))})
        if data_to_update['product_id']:
            data_to_update.update({'product_id':self.find_pro_pro_id_odoo17(data_to_update.get('product_tmpl_id'))})
        
        pricelis_item_obj_odoo17.write(data_to_update)

        return True

@http.route('/delete/pricelistitem', type='json', auth='user', methods=['POST'], website=True, csrf=False)
def update_pricelistitem_from_odo15(self,**post):
    # data_to_delete = [32, 31]
    result = http.request.params
    data_to_delete = result
    for item in data_to_delete:
        request.env['product.pricelist.item'].browse(item).unlink()
    return True
