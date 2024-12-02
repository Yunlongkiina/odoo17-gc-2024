# -*- coding: utf-8 -*-
# Copyright (C) Softhealer Technologies.

from odoo import models


class PosSessionInherit(models.Model):
    _inherit = 'pos.session'

    def _loader_params_product_product(self):
        result = super(PosSessionInherit,
                       self)._loader_params_product_product()
        result['search_params']['fields'].append('barcode_ids')
        return result

    def _pos_data_process(self, loaded_data):
        super()._pos_data_process(loaded_data)
        loaded_data['product_by_barcode'] = {
            data['id']: data for data in loaded_data['product.barcode.multi']}

    def _pos_ui_models_to_load(self):
        result = super()._pos_ui_models_to_load()
        if 'product.barcode.multi' not in result:
            result.append('product.barcode.multi')
        return result

    def _loader_params_product_barcode_multi(self):
        return {'search_params': {'domain': [], 'fields': ['create_date', 'name', 'product_id', ], 'load': False}}

    def _get_pos_ui_product_barcode_multi(self, params):
        return self.env['product.barcode.multi'].search_read(**params['search_params'])
