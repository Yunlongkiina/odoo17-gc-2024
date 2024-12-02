# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from itertools import groupby
from datetime import datetime, timedelta

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError
from odoo.tools import float_is_zero, float_compare, DEFAULT_SERVER_DATETIME_FORMAT
from odoo.tools.misc import formatLang
from odoo.tools import html2plaintext
import odoo.addons.decimal_precision as dp


class ProductBarcode(models.Model):
	_inherit = "product.product"

	@api.depends('barcode_ids','product_tmpl_id.barcode_ids')
	def _get_multi_barcode_search_string(self):
		for rec in self:
			barcode_search_string = rec.name
			for r in rec.barcode_ids:
				barcode_search_string += '|' + r.name

			for rc in rec.product_tmpl_id.barcode_ids:
				barcode_search_string += '|' + rc.name
			rec.product_barcodes = barcode_search_string
		return barcode_search_string

	product_barcodes = fields.Char(compute="_get_multi_barcode_search_string",string="Barcodes",store=True)



class POSOrderLoad(models.Model):
	_inherit = 'pos.session'


	def _loader_params_product_product(self):
		result = super()._loader_params_product_product()
		result['search_params']['fields'].extend(['product_barcodes'])
		return result


	def _pos_ui_models_to_load(self):
		result = super()._pos_ui_models_to_load()
		new_model = 'product.barcode'
		if new_model not in result:
			result.append(new_model)
		return result

	def _loader_params_product_barcode(self):
		return {
			'search_params': {
				'domain': [],
				'fields': [
					'name', 'product_id',
				],
			}
		}

	def _get_pos_ui_product_barcode(self, params):
		return self.env['product.barcode.multi'].search_read(**params['search_params'])

	