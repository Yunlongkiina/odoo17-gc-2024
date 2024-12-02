# -*- coding: utf-8 -*-

from odoo import api, fields, models, _


class PosConfig(models.Model):
	_inherit = "pos.config"

	goldencrop_employee_pricelist = fields.Many2many("product.pricelist","name", string="Employee Pricelist")

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    goldencrop_employee_pricelist = fields.Many2many(related='pos_config_id.goldencrop_employee_pricelist',readonly=False)

class PosSession(models.Model):
    _inherit = "pos.session"

    def _loader_params_res_partner(self):
            result = super()._loader_params_res_partner()
            result['search_params']['fields'].append('limited_amount')
            return result
    
    def _pos_ui_models_to_load(self):
        models = super()._pos_ui_models_to_load()
        if 'res.partner' not in models:
            models.append('res.partner')
        return models
    

