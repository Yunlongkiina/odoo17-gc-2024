# -*- coding: utf-8 -*-
from odoo import models, fields

class ProductTemplate(models.Model):

    _inherit = 'product.template'
    list_price = fields.Float(tracking=True)
