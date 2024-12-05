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

class PoSStockLocationGeneralConfig(models.TransientModel):
    _inherit = 'res.config.settings'

    is_middle_server_or_not = fields.Boolean("Is Middle Server (B server) or not",
                                             default=False,
                                             store=True,
                                             help="Current Server will be excuting B server's logic")

    is_C_server_or_not = fields.Boolean("Is Client Server (C server) or not",
                                        defualt=False,
                                        store=True,
                                        help="Current Server will be excuting C server's logic, stocks of products created on C server will not be synced to B")

    @api.model
    def get_values(self):
        res = super(PoSStockLocationGeneralConfig, self).get_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()
        res.update(
            is_middle_server_or_not = ICPSudo.get_param('is_middle_server_or_not'),
            is_C_server_or_not = ICPSudo.get_param('is_C_server_or_not')
        )
        return res

    def set_values(self):
        # let the system execute the normal saving program of res config settings, then decide if creating threads
        # for distributing stocks and customer credits etc.
        res = super(PoSStockLocationGeneralConfig, self).set_values()
        self.env['ir.config_parameter'].sudo().set_param('is_middle_server_or_not', self.is_middle_server_or_not)
        self.env['ir.config_parameter'].sudo().set_param('is_C_server_or_not', self.is_C_server_or_not)
        # One more logic requiring to be executed, if the field is_C_server_or_not is set as True.
        # Active the cron to sync stock data once a day from C server to B server
        if self.is_C_server_or_not:
            # search for corresponding cron
            cron_sync_pos_in_stock_products = self.env.ref('pos_stock_management.cron_sync_pos_in_stock_products')
            if cron_sync_pos_in_stock_products:
                cron_sync_pos_in_stock_products.write({'active': True})
                
        

    

    