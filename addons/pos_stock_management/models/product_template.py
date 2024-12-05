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

class ProductTemplate(models.Model):
    _inherit = "product.template"

    pos_stock_ids = fields.Many2many(comodel_name="pos.stock",
                                     string="PoS Stocks",
                                     store=True,
                                     inverse_name='prod_tmpl_id')

    @api.model
    def add_pos_stock_lines(self, prod_var_obj):
        var_obj = prod_var_obj
        self.write({'pos_stock_ids': [(4, var_obj.id)]})
        return

    @api.model
    def create_pos_stock_display_records(self):
        for record in self:
            # acquire all records available in pos stock location configs
            available_pos_stock_records = self.env["pos.stock.location.config"].sudo().search([])
            if available_pos_stock_records and not record.pos_stock_ids:
                pos_stock_list = list(set(available_pos_stock_records.mapped('location')))
                if pos_stock_list:
                    # when creating records, all product pos stock qty will be initialized as 0
                    vals_list = []
                    # create vals_list to update multiple records
                    vals = {}
                    # the following usage of updating dict only applied to Python 3.5 or greater versions
                    vals_list = [{**vals,
                        'prod_tmpl_id': record.id,
                        'prod_prod_id': record.product_variant_id.id,
                        'location': loc_to_add,
                        'available_quantity': 0} \
                    for loc_to_add in pos_stock_list]
                    var_objs = self.env['pos.stock'].sudo().create(vals_list)
                    # combine two recordsets into a single cell array
                    list(map(lambda var_obj: record.add_pos_stock_lines(var_obj), var_objs))
                    return

    @api.model_create_multi
    def create(self, vals_list):
        try:
            context = dict(self._context)
            templates = None
            ICPSudo = self.env['ir.config_parameter'].sudo()
            if context and ICPSudo.get_param('is_C_server_or_not'):
                templates = super(ProductTemplate, self.with_context(create_from_server_c=True)).create(vals_list)
            else:
                templates = super(ProductTemplate, self.with_context(create_from_server_c=False)).create(vals_list)
            return templates
        finally:
            try:
                templates.create_pos_stock_display_records()
            except Exception as e:
                _logger.debug(e)
                pass

     

    