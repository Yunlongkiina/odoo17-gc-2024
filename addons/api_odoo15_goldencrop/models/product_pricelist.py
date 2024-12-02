from odoo import models, api, fields
import logging

class PricelistItem(models.Model):
    _inherit = "product.pricelist"

    odoo15_pricelist_id = fields.Integer(string='Odoo15 Pricelist ID')
