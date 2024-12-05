from odoo import api, fields, models, _
from odoo.exceptions import UserError
from itertools import groupby
from operator import itemgetter
from datetime import date
from odoo.tools import frozendict

class StockMoveLine(models.Model):
    _inherit = 'stock.move.line'

    qty_done = fields.Float(compute='_compute_qty_done', inverse='_inverse_qty_done')
    reserved_uom_qty = fields.Float('Demand', default=0.0, digits='Product Unit of Measure', copy=False)

    @api.depends('picking_id')
    def _compute_qty_done(self):
        for line in self:
            line.qty_done = line.quantity if line.picked else 0

    def _inverse_qty_done(self):
        for line in self:
            line.quantity = line.qty_done
            line.picked = line.quantity > 0

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            # To avoid a write on `quantity` at the creation of the record (in the `qty_done`
            # inverse, when the line's move is not created yet), we set the `quantity` directly at
            # the creation and remove `qty_done` in the meantime.
            if 'qty_done' in vals:
                vals['quantity'] = vals['qty_done']
                #vals['picked'] = vals['qty_done'] > 0
                del vals['qty_done']
                # Also delete the default value in the context.
                self.env.context = frozendict({k: v for k, v in self.env.context.items() if k != 'default_qty_done'})
        return super().create(vals_list)

class StockMove(models.Model):
    _inherit = 'stock.move'

    reserved_uom_qty = fields.Float('Demand', compute='_compute_reserved_uom_qty', store=True, copy=False)

    @api.depends('product_uom_qty', 'move_line_ids.reserved_uom_qty')
    def _compute_reserved_uom_qty(self):
        for line in self:
            if line.product_uom_qty > 0:
                line.reserved_uom_qty = line.product_uom_qty
            else:
                reserved_qty = sum(line.move_line_ids.filtered(lambda item: item.reserved_uom_qty).mapped('reserved_uom_qty'))
                line.reserved_uom_qty = reserved_qty
                line.product_uom_qty = reserved_qty

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if 'product_uom_qty' in vals and vals['product_uom_qty'] > 0:
                vals['reserved_uom_qty'] = vals['product_uom_qty']
            else:
                move_line_ids = vals.get('move_line_ids', [])
                reserved_qty = sum(ml[2].get('reserved_uom_qty', 0) for ml in move_line_ids if ml[2])
                vals['reserved_uom_qty'] = reserved_qty
                vals['product_uom_qty'] = reserved_qty
        
        return super(StockMove, self).create(vals_list)



class ProductProductBarcodeApp(models.Model):
    _inherit = 'product.product'

    def get_detailed_type_name(self):
        name = ''
        if self.detailed_type == 'product':
            name = "Storable Product"
        elif self.detailed_type == 'consu':
            name = "Consumable"
        elif self.detailed_type == 'service':
            name = "Service"
        return name

    def get_product_info_barcode_app(self, quantity):
        self.ensure_one()

        user_id = self.env.user.id
        company_id = self.env.company.id
        currency_id = self.env.company.currency_id
        currency_data = {'symbol': currency_id.symbol, 'name': currency_id.name, 'position': currency_id.position}
        pricelists = self.env['product.pricelist'].search([])
        # price_per_pricelist_id = pricelists._price_get(self, quantity)
        # pricelist_list = [{'name': pl.name, 'price': price_per_pricelist_id[pl.id],
        #                    'currency_data': {'name': pl.currency_id.name, 'symbol': pl.currency_id.symbol,
        #                                      'position': pl.currency_id.position}} for pl in pricelists]
        # print(price_per_pricelist_id)
        pricelist_list =[]

        product_data = {
            "id": self.id,
            "detailed_type": self.get_detailed_type_name(),
            "display_name": self.display_name if self.display_name else '-',
            "name": self.name,
            "default_code": self.default_code if self.default_code else '-',
            "categ_id": self.categ_id.display_name,
            "weight": self.weight,
            "list_price": self.list_price,
            "standard_price": self.standard_price,
            "write_date": self.write_date,
            "qty_available": self.qty_available,
            "virtual_available": self.virtual_available,
            "barcode": self.barcode if self.barcode else '-',
            "description_sale": self.description_sale if self.description_sale else '-',
            "uom_id": self.uom_id.display_name,
            "uom_po_id": self.uom_po_id.display_name,
            "volume": self.volume,
            "sale_delay": self.sale_delay,
            "volume_uom_name": self.volume_uom_name,
            "weight_uom_name": self.weight_uom_name,
            "hq_qty": 1,
        }
        warehouse_list = [
            {'name': w.name,
             'id': w.id,
             'stock_location': w.lot_stock_id.display_name,
             'child_locations': [
                 {'location': location.display_name,
                  'available_quantity': self.with_context({'location': location.id}).qty_available,
                  'forecasted_quantity': self.with_context({'location': location.id}).virtual_available,
                  'lot_lines': [{'lot_id': stock_lot_lines.lot_id.name, 'quantity': stock_lot_lines.quantity}
                                for stock_lot_lines in self.env['stock.quant'].search(
                          [('product_id', '=', self.id), ('location_id', '=', location.id)]) if
                                stock_lot_lines.lot_id.name]
                  }

                 for location in w.lot_stock_id.child_internal_location_ids],
             'available_quantity': self.with_context({'warehouse': w.id}).qty_available,
             'forecasted_quantity': self.with_context({'warehouse': w.id}).virtual_available,
             'uom': self.uom_name}
            for w in self.env['stock.warehouse'].search([])]

        print(warehouse_list)
        pos_stock_list = [
            {'name': ps.location,
             'id': ps.id,
             'quantity': ps.available_quantity,
            }
            for ps in self.env["product.product"].browse(self.id).pos_stock_ids]
        
        print(pos_stock_list)

        # Warehouses
        warehouse_list_without_zero_stock = [
            {'name': w.name,
             'id': w.id,
             'stock_location': w.lot_stock_id.display_name,
             'child_locations': [
                 {'location': location.display_name,
                  'available_quantity': self.with_context({'location': location.id}).qty_available,
                  'forecasted_quantity': self.with_context({'location': location.id}).virtual_available,
                  'lot_lines': [{'lot_id': stock_lot_lines.lot_id.name, 'quantity': stock_lot_lines.quantity}
                                for stock_lot_lines in self.env['stock.quant'].search(
                          [('product_id', '=', self.id), ('location_id', '=', location.id)]) if
                                stock_lot_lines.lot_id.name],
                  }
                 for location in w.lot_stock_id.child_internal_location_ids if
                 self.with_context({'location': location.id}).qty_available != 0],
             'available_quantity': self.with_context({'warehouse': w.id}).qty_available,
             'forecasted_quantity': self.with_context({'warehouse': w.id}).virtual_available,
             'uom': self.uom_name}
            for w in self.env['stock.warehouse'].search([])]

        # Suppliers
        key = itemgetter('partner_id')
        supplier_list = []
        for key, group in groupby(sorted(self.seller_ids, key=key), key=key):
            for s in list(group):
                if not ((s.date_start and s.date_start > date.today()) or (
                        s.date_end and s.date_end < date.today()) or (s.min_qty > quantity)):
                    supplier_list.append({
                        'name': s.partner_id.name,
                        'delay': s.delay,
                        'price': s.price,
                        'min_qty': s.min_qty,
                        'product_uom': s.product_uom.display_name,
                        'currency_data': {'name': s.currency_id.name, 'symbol': s.currency_id.symbol,
                                          'position': s.currency_id.position}
                    })
                    break

        # Variants
        variant_list = [{'name': attribute_line.attribute_id.name,
                         'values': list(
                             map(lambda attr_name: {'name': attr_name, 'search': '%s %s' % (self.name, attr_name)},
                                 attribute_line.value_ids.mapped('name')))}
                        for attribute_line in self.attribute_line_ids]

        # return {}

        return {
            # 'all_prices': all_prices,
            'product_data': product_data,
            'warehouses': warehouse_list,
            'pos_stock_list': pos_stock_list,
            'warehouse_list_without_zero_stock': warehouse_list_without_zero_stock,
            'suppliers': supplier_list,
            'variants': variant_list,
            'price_list': pricelist_list,
            'user_id': user_id,
            'company_id': company_id,
            'currency_data': currency_data,
        }


class GetStockMoveLines(models.Model):
    _name = 'warehouse.operation.barcode'

    def main_screen_data(self, barcode):
        operation_type = self.env['stock.picking.type'].search([('barcode', '=', barcode)])
        stock_picking = self.env['stock.picking'].search([('name', '=', barcode)])
        location = self.env['stock.location'].search([('barcode', '=', barcode)])
        product = self.env['product.product'].search([('barcode', '=', barcode)])
        operation_type_data = []
        stock_picking_data = []
        product_data = []
        selected_location_data = []
        if len(operation_type) > 0:
            operation_type_data.append({'id': operation_type.id})
        elif len(product) > 0:
            product_data.append(barcode)
        elif len(stock_picking) > 0:
            stock_picking_data.append(
                {'picking_id': stock_picking.id, 'picking_type_id': stock_picking.picking_type_id.id})
        elif len(location) > 0:
            warehouse = location.warehouse_id.id
            operation_type_selected = self.env['stock.picking.type'].search(
                [('warehouse_id', '=', warehouse), ('code', '=', 'internal')])
            if len(operation_type_selected) == 1:
                selected_location_data.append(
                    {'id': operation_type_selected[0].id,
                     'location': [location.id, location.display_name]
                     })

        return {
            'operation_type': operation_type_data,
            'product': product_data,
            'stock_picking': stock_picking_data,
            'selected_location_data': selected_location_data
        }

    def group_check(self, users, user_id):
        for user in users:
            if user.id == user_id:
                return True
        return False

    def get_stock_operation_type_data(self, ):

        picking_type_data_complete = []
        groups_data = self.env['stock.picking.type'].read_group(domain=[], fields=[],
                                                                groupby=['warehouse_id'], lazy=False)
        for data in groups_data:
            warehouse = self.env['stock.warehouse'].search([('id', '=', data['warehouse_id'][0])])
            picking_types = self.env['stock.picking.type'].search([('warehouse_id', '=', data['warehouse_id'][0])])
            picking_type_data = []
            for picking_type in picking_types:
                picking_data = {
                    "id": picking_type.id,
                    "default_location_src_id": picking_type.default_location_src_id.id,
                    "default_location_dest_id": picking_type.default_location_dest_id.id,
                    "display_name": picking_type.display_name,
                    "name": picking_type.name,
                    "warehouse_id": picking_type.warehouse_id.id,
                    "count_picking_ready": picking_type.count_picking_ready
                }
                picking_type_data.append(picking_data)
            print(self.env)
            # print(self.env.config)

            picking_type_data_complete.append(
                {'warehouse': [warehouse.id, warehouse.name], 'warehouse_operation_types': picking_type_data,
                 'breadcrums': self.env})

        return picking_type_data_complete

    def validate_barcode(self, data, picking_id):
        display_parts_complex = data['display_parts_complex']
        src_locations = data['src_locations']
        dest_locations = data['dest_locations']
        stock_move_line_ids = []

        for i in range(len(display_parts_complex)):
            display_parts = display_parts_complex[i]
            src_location = src_locations[i]
            dest_location = dest_locations[i]
            part_ids = []
            prepared_stock_moves = []
            for stock_move in display_parts:
                vals = {
                    'product_id': stock_move['data']['product_id'],
                    'location_id': src_location[0],
                    'location_dest_id': dest_location[0],
                    'reserved_uom_qty': stock_move['data']['reserved_uom_qty'],
                    'qty_done': stock_move['data']['qty_done'],
                    'product_uom_id': 1,
                }
                vals1 = {
                    'product_id': stock_move['data']['product_id'],
                    'location_id': src_location[0],
                    'location_dest_id': dest_location[0],
                    'qty_done': stock_move['data']['qty_done'],
                }
                if stock_move['genuine_stock_move']:
                    prepared_stock_moves.append((1, stock_move['data']['id'], vals1))
                elif not stock_move['genuine_stock_move']:
                    prepared_stock_moves.append((0, 0, vals))
            stock_move_line_ids.extend(prepared_stock_moves)

        param = {
            'move_line_ids': stock_move_line_ids
        }
        # print(stock_move_line_ids)

        picking = self.env['stock.picking'].search([('id', '=', picking_id)])
        picking.write({'move_line_ids': stock_move_line_ids})

    def get_stock_move_lines(self, picking_id, operation_type_id):
        src_location = []
        dest_location = []
        src_line_locations = []
        dest_line_locations = []
        stock_move_lines_prepared = []
        line_id = 1
        source_location_default = None
        dest_location_default = None
        operation_type = self.env['stock.picking.type'].search([('id', '=', operation_type_id)])
        stock_picking = self.env['stock.picking'].search([('id', '=', picking_id)])
        picking_data = {
            'id': stock_picking.id,
#            'immediate_transfer': stock_picking.immediate_transfer,
            'name': stock_picking.name,
            'state': stock_picking.state
        }
        operation_type = stock_picking.picking_type_id
        picking_src_location = False if len(stock_picking.location_id) == 0 else [stock_picking.location_id.id,
                                                                                  stock_picking.location_id.display_name,
                                                                                  True]
        picking_dest_location = False if len(stock_picking.location_dest_id) == 0 else [
            stock_picking.location_dest_id.id, stock_picking.location_dest_id.display_name, True]

        if operation_type.code == 'incoming':
            if operation_type.default_location_src_id:
                source_location_default = operation_type.default_location_src_id.id
            else:
                customerloc, supplier_loc = self.env['stock.warehouse']._get_partner_locations()
                source_location_default = supplier_loc.id

            dest_location_default = operation_type.default_location_dest_id.id
        elif operation_type.code == 'outgoing':

            if operation_type.default_location_dest_id:
                dest_location_default = operation_type.default_location_dest_id.id
            else:
                customerloc, supplierloc = self.env['stock.warehouse']._get_partner_locations()
                dest_location_default = customerloc.id
            source_location_default = operation_type.default_location_src_id.id

        elif operation_type.code == 'internal':
            if not self.user_has_groups('stock.group_stock_multi_locations'):
                return {
                    'warning': {
                        'message': _(
                            'You need to activate storage locations to be able to do internal operation types.')
                    }
                }
            else:

                source_location_default = operation_type.default_location_src_id.id
                dest_location_default = operation_type.default_location_dest_id.id
        print(source_location_default)
        print(dest_location_default)

        if operation_type.default_location_src_id:
            src_location = [operation_type.default_location_src_id.id,
                            operation_type.default_location_src_id.display_name, True]
        else:
            src_location = False

        if operation_type.default_location_dest_id:

            dest_location = [operation_type.default_location_dest_id.id,
                             operation_type.default_location_dest_id.display_name, True]
        else:
            dest_location = False
        child_src_locations = [[location.id, location.display_name] for location in
                               operation_type.default_location_src_id.child_internal_location_ids]
        child_dest_locations = [[location.id, location.display_name] for location in
                                operation_type.default_location_dest_id.child_internal_location_ids]

        groups_data = self.env['stock.move.line'].read_group(domain=[('picking_id', '=', picking_id)], fields=[],
                                                             groupby=['location_id', 'location_dest_id'],
                                                             lazy=False)
        stock_move_lines = self.env['stock.move.line'].search([('picking_id', '=', picking_id)])
        for locations in groups_data:
            src_line_location = self.env['stock.location'].search([('id', '=', locations['location_id'][0])])
            dest_line_location = self.env['stock.location'].search([('id', '=', locations['location_dest_id'][0])])
            src_line_locations.append([src_line_location.id, src_line_location.display_name, False])
            dest_line_locations.append([dest_line_location.id, dest_line_location.display_name, False])

        for location_index in range(len(src_line_locations)):
            data = []
            for stock_move_line in stock_move_lines:

                if src_line_locations[location_index][0] == stock_move_line.location_id.id and \
                        dest_line_locations[location_index][0] == stock_move_line.location_dest_id.id:
                    data.append({
                        'id': line_id,
                        'genuine_stock_move': True,
                        'data': {
                            'id': stock_move_line.id,
                            'display_name': stock_move_line.display_name,
                            'product_id': stock_move_line.product_id.id,
                            # 'product_qty': stock_move_line.product_qty,
                            #'reserved_uom_qty': stock_move_line.reserved_uom_qty,
                            'reserved_uom_qty': stock_move_line.quantity,
                            'demand_qty': stock_move_line.reserved_uom_qty,
                            'qty_done': stock_move_line.qty_done,
                        }})
                    line_id = line_id + 1
            stock_move_lines_prepared.append(data)

        operation_type_details = {
            'id': operation_type.id,
            'default_location_src_id': operation_type.default_location_src_id.id,
            'default_location_dest_id': operation_type.default_location_dest_id.id
        }
        print(operation_type)
        print(operation_type.default_location_src_id)

        return {
            # 'picking_type_src_location_default': source_location_default,
            # 'picking_type_dest_location_default': dest_location_default,
            'operation_type': operation_type_details,
            'picking': picking_data,
            'picking_type_src_location': src_location,  # stock picking type src location
            'picking_type_dest_location': dest_location,  # stock picking type dest location
            'picking_src_location': picking_src_location,  # stock picking src location
            'picking_dest_location': picking_dest_location,  # stock picking dest location
            'child_src_locations': child_src_locations,
            'child_dest_locations': child_dest_locations,
            'src_line_locations': [picking_src_location] if len(src_line_locations) == 0 else src_line_locations,
            # loactions of stock move
            'dest_line_locations': [picking_dest_location] if len(dest_line_locations) == 0 else dest_line_locations,
            'display_parts': [[]] if len(stock_move_lines_prepared) == 0 else stock_move_lines_prepared,
            'line_id': line_id
        }


class GetStockQuantLines(models.Model):
    _name = 'stock.quant.line.prepare'

    def get_inventory_adjustment_lines(self):
        src_locations = []
        inventory_lines_prepared = []
        internal_src_location_list = []
        line_id = 1
        user_id = self.env.user.id
        company_id = self.env.company.id
        groups_data = self.env['stock.quant'].read_group(domain=[('user_id', '=', user_id)], fields=[],
                                                         groupby=['location_id'],
                                                         lazy=False)
        inventory_lines = self.env['stock.quant'].search(
            [('user_id', '=', user_id), ('company_id', '=', company_id), ('lot_id', '=', False)])
        warehouses = self.env['stock.warehouse'].search([('company_id', '=', company_id)])
        # internal_locations = self.env['stock.location'].search([('company_id', '=', company_id)])

        for data in groups_data:
            src_locations.append(data['location_id'])

        for location_index in range(len(src_locations)):
            data = []
            for inventory_line in inventory_lines:

                if src_locations[location_index][0] == inventory_line.location_id.id:
                    # this if statement is useless('lot_id','=',False)
                    if not inventory_line.lot_id:
                        data.append({
                            'id': line_id,
                            'is_selected': False,
                            'genuine_inventory_line': True,
                            'data': {
                                'id': inventory_line.id,
                                'display_name': inventory_line.product_id.display_name,
                                'name': inventory_line.product_id.name,
                                'write_date': inventory_line.product_id.write_date,
                                'default_code': inventory_line.product_id.default_code,
                                'product_id': inventory_line.product_id.id,
                                'weight': inventory_line.product_id.weight,
                                'user_id': inventory_line.user_id.id,
                                'inventory_quantity_set': inventory_line.inventory_quantity_set,
                                'inventory_quantity': inventory_line.inventory_quantity,
                                'quantity': inventory_line.quantity,
                                'inventory_diff_quantity': inventory_line.inventory_diff_quantity,
                            }})
                        line_id = line_id + 1
            inventory_lines_prepared.append(data)

        for warehouse in warehouses:
            child_locations = warehouse.lot_stock_id.child_internal_location_ids
            child_location_data = []
            for child_location in child_locations:
                child_location_data.append([child_location.id, child_location.display_name])
            internal_src_location_list.append(
                {'warehouse': [warehouse.id, warehouse.display_name],
                 'child_locations': child_location_data
                 })

        groups = {
            'group_production_lot': self.group_check(self.env.ref('stock.group_production_lot').users, user_id),
            'group_tracking_lot': self.group_check(self.env.ref('stock.group_tracking_lot').users, user_id),
            'group_tracking_owner': self.group_check(self.env.ref('stock.group_tracking_owner').users, user_id),
            'group_uom': self.group_check(self.env.ref('uom.group_uom').users, user_id),
            'group_multi_company': self.group_check(self.env.ref('base.group_multi_company').users, user_id),
            'group_stock_user': self.group_check(self.env.ref('stock.group_stock_user').users, user_id),
            'group_stock_manager': self.group_check(self.env.ref('stock.group_stock_manager').users, user_id),
        }

        print(groups)

        return {
            'src_locations': [[]] if len(src_locations) == 0 else src_locations,
            'internal_src_location_list': internal_src_location_list,
            'user_id': user_id,
            'company_id': company_id,
            'display_parts': [[]] if len(inventory_lines_prepared) == 0 else inventory_lines_prepared,
            'line_id': line_id,
            'groups': groups
        }

    def group_check(self, users, user_id):
        for user in users:
            if user.id == user_id:
                return True
        return False

    def get_inventory_adjustment_data_location(self, product_id, location_id):
        company_id = self.env.company.id
        inventory_line_array = self.env['stock.quant'].search(
            [('location_id', '=', location_id), ('product_id', '=', product_id), ('company_id', '=', company_id),
             ('lot_id', '=', False)])
        data = {}
        if len(inventory_line_array) == 1:
            inventory_line = inventory_line_array[0]
            data = {
                'id': 0,
                'is_selected': False,
                'genuine_inventory_line': False,
                'data': {
                    'id': inventory_line.id,
                    'display_name': inventory_line.product_id.display_name,
                    'name': inventory_line.product_id.name,
                    'write_date': inventory_line.product_id.write_date,
                    'default_code': inventory_line.product_id.default_code,
                    'product_id': inventory_line.product_id.id,
                    'weight': inventory_line.product_id.weight,
                    'user_id': inventory_line.user_id.id,
                    'inventory_quantity': inventory_line.inventory_quantity,
                    'quantity': inventory_line.quantity,
                    'inventory_diff_quantity': inventory_line.inventory_diff_quantity,
                }}
        elif len(inventory_line_array) == 0:
            return {}

        # this will not reached beacuse domain has ('lot_id','=',False)
        elif len(inventory_line_array) > 1:
            for inventory_line in inventory_line_array:
                if not inventory_line.lot_id:
                    data = {
                        'id': 0,
                        'is_selected': False,
                        'genuine_inventory_line': False,
                        'data': {
                            'id': inventory_line.id,
                            'display_name': inventory_line.product_id.display_name,
                            'name': inventory_line.product_id.name,
                            'write_date': inventory_line.product_id.write_date,
                            'default_code': inventory_line.product_id.default_code,
                            'product_id': inventory_line.product_id.id,
                            'weight': inventory_line.product_id.weight,
                            'user_id': inventory_line.user_id.id,
                            'inventory_quantity_set': inventory_line.inventory_quantity_set,
                            'inventory_quantity': inventory_line.inventory_quantity,
                            'quantity': inventory_line.quantity,
                            'inventory_diff_quantity': inventory_line.inventory_diff_quantity,
                        }}

        return {
            'display_parts': data,
        }


class GetInventoryTransferData(models.Model):
    _name = 'stock.operation.data.prepare'

    def group_check(self, users, user_id):
        for user in users:
            if user.id == user_id:
                return True
        return False

    def get_stock_operation_type_data(self, operation_type_id):
        user_id = self.env.user.id
        company_id = self.env.company.id
        source_location_default = 0
        dest_location_default = 0

        operation_type = self.env['stock.picking.type'].search([('id', '=', operation_type_id)])

        if len(operation_type) == 1:
            if operation_type.default_location_src_id:
                source_location = [operation_type.default_location_src_id.id,
                                   operation_type.default_location_src_id.display_name, True]
            else:
                source_location = False
            if operation_type.default_location_dest_id:

                dest_location = [operation_type.default_location_dest_id.id,
                                 operation_type.default_location_dest_id.display_name, True]
            else:
                dest_location = False
            child_src_locations = [[location.id, location.display_name] for location in
                                   operation_type.default_location_src_id.child_internal_location_ids]
            child_dest_locations = [[location.id, location.display_name] for location in
                                    operation_type.default_location_dest_id.child_internal_location_ids]

            if operation_type.code == 'incoming':
                if operation_type.default_location_src_id:
                    source_location_default = operation_type.default_location_src_id.id
                else:
                    customerloc, supplier_loc = self.env['stock.warehouse']._get_partner_locations()
                    source_location_default = supplier_loc.id

                dest_location_default = operation_type.default_location_dest_id.id
            elif operation_type.code == 'outgoing':

                if operation_type.default_location_dest_id:
                    dest_location_default = operation_type.default_location_dest_id.id
                else:
                    customerloc, supplierloc = self.env['stock.warehouse']._get_partner_locations()
                    dest_location_default = customerloc.id
                source_location_default = operation_type.default_location_src_id.id

            elif operation_type.code == 'internal':
                if not self.user_has_groups('stock.group_stock_multi_locations'):
                    return {
                        'warning': {
                            'message': _(
                                'You need to activate storage locations to be able to do internal operation types.')
                        }
                    }
                else:

                    source_location_default = operation_type.default_location_src_id.id
                    dest_location_default = operation_type.default_location_dest_id.id
            print(source_location_default)
            print(dest_location_default)
            # customerloc, location_id = self.env['stock.warehouse']._get_partner_locations()

            groups = {
                'group_production_lot': self.group_check(self.env.ref('stock.group_production_lot').users, user_id),
                'group_tracking_lot': self.group_check(self.env.ref('stock.group_tracking_lot').users, user_id),
                'group_tracking_owner': self.group_check(self.env.ref('stock.group_tracking_owner').users, user_id),
                'group_uom': self.group_check(self.env.ref('uom.group_uom').users, user_id),
                'group_multi_company': self.group_check(self.env.ref('base.group_multi_company').users, user_id),
                'group_stock_manager': self.group_check(self.env.ref('stock.group_stock_manager').users, user_id),
                'group_stock_user': self.group_check(self.env.ref('stock.group_stock_user').users, user_id)
            }
            print(groups)

            return {
                'source_locations': source_location,
                'dest_locations': dest_location,
                'source_location_default': source_location_default,
                'dest_location_default': dest_location_default,
                'child_src_locations': child_src_locations,
                'child_dest_locations': child_dest_locations,
                'user_id': user_id,
                'company_id': company_id,
                'groups': groups
            }

    def scan_get_data(self, barcode):
        product = self.env['product.product'].search([('barcode', '=', barcode)])
        product_data = []
        location_data = []
        operation_type_data = []
        if len(product) == 1:
            product_data.append({
                'id': product.id,
                'write_date': product.write_date,
                'default_code': product.default_code,
                'display_name': product.display_name,
                'weight': product.weight,
                'uom_id': [product.uom_id.id, product.uom_id.name],
                'tracking': product.tracking,
                'qty_available': product.qty_available,
                'name': product.name,
                'hq_qty': list({hq_qty.available_quantity for hq_qty in self.env['pos.stock'].search(
                              [('prod_prod_id', '=', product.id),('location', '=', 'WH-H/Stock')]) if
                                hq_qty.id})[0],
                "virtual_available": product.virtual_available,
            })
        elif len(product) == 0:
            location = self.env['stock.location'].search([('barcode', '=', barcode)])

            if len(location) == 1:
                location_data.append({
                    'id': location.id,
                    'display_name': location.display_name
                })

            elif len(location) == 0:
                operation_type = self.env['stock.picking.type'].search([('barcode', '=', barcode)])
                if len(operation_type) == 1:
                    operation_type_data.append({
                        "id": operation_type.id,
                        "default_location_src_id": operation_type.default_location_src_id.id,
                        "default_location_dest_id": operation_type.default_location_dest_id.id,
                        "display_name": operation_type.display_name,
                        "name": operation_type.name,
                        "warehouse_id": [operation_type.warehouse_id.id, operation_type.warehouse_id.display_name]
                    })
        return {
            "product_data": product_data,
            "location_data": location_data,
            "operation_type_data": operation_type_data
        }

    def action_apply(self):
        print('t')


####inventory adjustment
class SaveBarcodeData(models.Model):
    _inherit = 'stock.quant'

    def save_barcode_data(self, prepared_inventory_lines):

        user_id = self.env.user.id
        inventory_adjustment_ids = []
        for prepared_inventory_line in prepared_inventory_lines:
            inventory_line = prepared_inventory_line['inventory_line']

            if inventory_line['genuine_inventory_line']:
                if inventory_line['data']['inventory_quantity_set']:
                    inventory_adjustment = self.env['stock.quant'].search([('id', '=', inventory_line['data']['id'])])
                    inventory_adjustment.ensure_one()
                    inventory_adjustment.write(
                        {"inventory_quantity": inventory_line['data']['inventory_quantity'], "user_id": user_id,
                         "inventory_quantity_set": inventory_line['data']['inventory_quantity_set']})
                    inventory_adjustment_ids.append(inventory_line['data']['id'])

                elif not inventory_line['data']['inventory_quantity_set']:
                    inventory_adjustment = self.env['stock.quant'].search([('id', '=', inventory_line['data']['id'])])
                    inventory_adjustment.action_set_inventory_quantity_to_zero()
                    inventory_adjustment_ids.append(inventory_line['data']['id'])

            elif not inventory_line['genuine_inventory_line']:
                if inventory_line['data']['inventory_quantity_set']:
                    if inventory_line['data']['id']:
                        inventory_adjustment = self.env['stock.quant'].search(
                            [('id', '=', inventory_line['data']['id'])])
                        inventory_adjustment.ensure_one()
                        inventory_adjustment.write(
                            {"inventory_quantity": inventory_line['data']['inventory_quantity'], "user_id": user_id,
                             "inventory_quantity_set": inventory_line['data']['inventory_quantity_set']})
                        inventory_adjustment_ids.append(inventory_line['data']['id'])

                    elif not inventory_line['data']['id']:
                        created_id = self.env['stock.quant'].create(
                            {'location_id': prepared_inventory_line['src_location'],
                             'product_id': inventory_line['data']['product_id'],
                             'inventory_quantity': inventory_line['data']['inventory_quantity'],
                             'inventory_quantity_set': inventory_line['data']['inventory_quantity_set'],
                             'user_id': user_id})
                        inventory_adjustment_ids.append(created_id.id)

                elif not inventory_line['data']['inventory_quantity_set']:
                    print('dont add')

        return [inventory_adjustment_id for inventory_adjustment_id in inventory_adjustment_ids]
