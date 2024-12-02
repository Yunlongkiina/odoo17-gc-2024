# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models,api


class ResConfigSettings(models.TransientModel):
    _inherit = ['res.config.settings']

    token_valid = fields.Float(
        string='Token Autovacuum Hours',
        config_parameter='partner_final_price_goldencrop.token_valid')