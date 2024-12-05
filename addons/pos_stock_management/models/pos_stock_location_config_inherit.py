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

class PoSStockLocationConfig(models.Model):
    _inherit = "pos.stock.location.config"

    def add_pos_stock_lines(self, prod_var_obj):
        try:
            prod_tmpl_obj = prod_var_obj[0]
            var_obj = prod_var_obj[1]
            prod_tmpl_obj.write({'pos_stock_ids': [(4, var_obj.id)]})
        except Exception as e:
            raise ValidationError(e)

    @api.model_create_multi
    def create(self, vals_list):
        import time
        start_time = time.time()
        res = super(PoSStockLocationConfig, self).create(vals_list)
        # get values dict
        vals_dict = vals_list[0]
        if vals_dict:
            # search all available product templates
            prod_tmpl = self.env['product.template'].search([])
            # prepare line values for multiple products pos_stock_ids
            if vals_dict.get('location') and prod_tmpl:
                loc_to_add = vals_dict.get('location')
                # when creating records, all product pos stock qty will be initialized as 0
                vals_list = []
                # create vals_list to update multiple records
                vals = {}
                # the following usage of updating dict only applied to Python 3.5 or greater versions
                vals_list = [{**vals,
                    'prod_tmpl_id': prod_tmpl_rec.id,
                    'prod_prod_id': prod_tmpl_rec.product_variant_id.id,
                    'location': loc_to_add,
                    'available_quantity': 0} \
                for i, prod_tmpl_rec in zip(range(0, len(prod_tmpl.ids)), prod_tmpl)]
                var_objs = self.env['pos.stock'].sudo().create(vals_list)
                # combine two recordsets into a single cell array
                prod_var_list = [(prod_tmpl_obj, var_obj) for prod_tmpl_obj, var_obj in zip(prod_tmpl, var_objs)]
                # use the map function to improve program execution efficiency
                list(map(lambda prod_var_obj: self.add_pos_stock_lines(prod_var_obj), prod_var_list))
            else:
                raise ValidationError("Please input a non-empty locations when creating records of Pos Local Stock/Product Template has no records")
        else:
            raise ValidationError("vals_list is empty during the creation of pos.stock.location.config records!!!")
        end_time = time.time()
        _logger.debug(f"Time spent in total for creating: {end_time - start_time}")
        return res

    def write(self, vals):
        import time
        start_time = time.time()
        # get old location
        old_pos_stock_location = self.location
        _logger.debug(old_pos_stock_location)
        res = super(PoSStockLocationConfig, self).write(vals)
        # get values dict
        if vals:
            # search all available pos stock records
            pos_stock_to_update = self.env['product.template'].search([]).pos_stock_ids.filtered(lambda item: item.location == old_pos_stock_location)
            if pos_stock_to_update:
                # the pos stock records will be updated only if the field location
                loc_to_update = vals.get('location')
                # when creating records, all product pos stock qty will be initialized as 0
                vals = {'location': loc_to_update}
                pos_stock_to_update.location = loc_to_update
                _logger.debug("write method is called!!!")
                _logger.debug(vals)
            else:
                raise ValidationError("There are no pos stock records available for location name updates")
        end_time = time.time()
        _logger.debug(f"Time spent in total for updating: {end_time - start_time}")
        return res

    def unlink(self):
        import time
        start_time = time.time()
        res = None
        for record in self:
            # get old location
            old_pos_stock_location = record.location
            res = super(PoSStockLocationConfig, record).unlink()
            # search all available pos stock records
            pos_stock_to_unlink = self.env['product.template'].search([]).pos_stock_ids.filtered(lambda item: item.location == old_pos_stock_location)
            pos_stock_to_unlink.unlink()
            end_time = time.time()
            _logger.debug(f"Time spent in total for updating: {end_time - start_time}")
        return res

    def create_records_for_missed_prod_tmpl(self):
        # get products which pos stock lines need to be added
        all_storable_products = self.env['product.template'].search([('detailed_type', 'not in', ['consu', 'service', 'gift'])])
        storeable_prods_without_pos_records = all_storable_products.filtered(lambda item: not item.pos_stock_ids)
        # get all available locations setup in pos stock display
        all_available_locs = self.env['pos.stock.location.config'].search([]).mapped('location')
        if all_available_locs:
            for location_to_add in all_available_locs:
                # search all available product templates
                prod_tmpl = storeable_prods_without_pos_records
                # prepare line values for multiple products pos_stock_ids
                if location_to_add and prod_tmpl:
                    # when creating records, all product pos stock qty will be initialized as 0
                    vals_list = []
                    # create vals_list to update multiple records
                    vals = {}
                    # the following usage of updating dict only applied to Python 3.5 or greater versions
                    vals_list = [{**vals,
                        'prod_tmpl_id': prod_tmpl_rec.id,
                        'prod_prod_id': prod_tmpl_rec.product_variant_id.id,
                        'location': location_to_add,
                        'available_quantity': 0} \
                    for i, prod_tmpl_rec in zip(range(0, len(prod_tmpl.ids)), prod_tmpl)]
                    var_objs = self.env['pos.stock'].sudo().create(vals_list)
                    # combine two recordsets into a single cell array
                    prod_var_list = [(prod_tmpl_obj, var_obj) for prod_tmpl_obj, var_obj in zip(prod_tmpl, var_objs)]
                    # use the map function to improve program execution efficiency
                    list(map(lambda prod_var_obj: self.add_pos_stock_lines(prod_var_obj), prod_var_list))
                else:
                    raise ValidationError("Please input a non-empty locations when creating records of Pos Local Stock/Product Template has no records")

    