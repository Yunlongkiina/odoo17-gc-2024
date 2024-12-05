import logging
from odoo import api,fields,models
from odoo.exceptions import ValidationError
from logging import getLogger

_logger = logging.getLogger(__name__)

"""
# set up the log level
_logger.setLevel(logging.DEBUG)
# appending mode 'a', utf-8 encoding is set up to prevent messy codes
test_log = logging.FileHandler('/opt/debug-log/debug-log.log', 'a', 'utf-8')
# the log level output to files
test_log.setLevel(logging.DEBUG)
# the log format output to files
formatter = logging.Formatter('%(asctime)s - %(filename)s - line:%(lineno)d - %(levelname)s - %(message)s - %(process)s')
test_log.setFormatter(formatter)

# load files into the logger object
_logger.addHandler(test_log)
"""

class PoSStockLocationMappingConfig(models.Model):
    _name = "pos.stock.location.mapping.config"
    _description = "Multiple Stocks Mapping"

    local_location = fields.Many2one('stock.warehouse',
                                    string='Current Server Warehouse Location',
                                    help="Select available warehouse locations on current local server to create mapping records",
                                    domain=lambda self: [("id", "in", self.env["stock.warehouse"].search([('company_id.id', '=', self.env.company.id)]).mapped('id'))])
                    
    target_server_ip = fields.Char("Target Server URL")
    target_server_type = fields.Selection([('middleware_server', 'Middleware Server'),
                                           ('client_server', 'Client Server')],
                                           default='',
                                           string='Target Server Type')
    transfer_type = fields.Selection([('request','Request'),
                                      ('make_transfer','Make Transfer')],
                                      default='request', 
                                      string='Transfer Type',
                                      required=True)

    access_token = fields.Char("Target Server Access Token", default="No access token")

    target_server_location = fields.Char("Target Server Location", store=True)
    login = fields.Char("Login Username")
    password = fields.Char("Password")
    api_key = fields.Char("Login Api Key")

    is_middle_server_or_not = fields.Boolean(string="Is Middle Server or Not", default=False, compute="_compute_middle_server_or_not")

    def _compute_middle_server_or_not(self):
        for record in self:
            record.is_middle_server_or_not = self.env['ir.config_parameter'].sudo().get_param('is_middle_server_or_not')

    def get_mapping_target_server_access_token(self):
        for record in self:
            if record.login and record.password and record.api_key and record.target_server_ip:
                record.access_token = self.env['pos.stock'].get_access_token(record)
    