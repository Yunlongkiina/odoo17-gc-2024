import logging
import base64
import requests
import ast
import json
import aiohttp
import asyncio
from odoo import api,fields,models
from odoo.exceptions import ValidationError
from logging import getLogger
from datetime import datetime

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

# setup aiohttp timeout
timeout = aiohttp.ClientTimeout(total=60)

class StockMoveLine(models.Model):
    _inherit = "stock.move"

    def _action_done(self, **kwargs):
        """
            This function is used for syncing the stock data to other servers 
            Input: input args of _action_done function in stock.move
            Output: inherited object
        """
        # initialize the res
        res = None
        try:
            res = super()._action_done(**kwargs)
            return res
        finally:
            if 'merge_into' not in kwargs.keys() and res:
                # acquire source and dest in stock move lines
                sour_warehouse = res.mapped('move_line_ids').mapped('location_id').warehouse_id
                des_warehouse = res.mapped('move_line_ids').mapped('location_dest_id').warehouse_id
                channel_mapping_warehouses = self.env['pos.stock.location.mapping.config'].search([]).mapped('local_location')
                if sour_warehouse != des_warehouse:
                    if set(sour_warehouse.mapped('id')).intersection(set(channel_mapping_warehouses.mapped('id'))) or\
                       set(des_warehouse.mapped('id')).intersection(set(channel_mapping_warehouses.mapped('id'))):
                        res.post_pos_stock(stock_operation='_action_done')

    def get_access_token(self, channel_record):
        # get the access token first
        # prepare the headers first (be sure to add escape characters)
        res_json_token = None
        response = None
        try:
            login_credentials = {"login": channel_record.login, "password": channel_record.password}
            login_credentials = str(login_credentials).replace("'", '"')
            login_credentials_bytes = login_credentials.encode()
            login = base64.b64encode(login_credentials_bytes)
            headers = {"login": login,
                       "api-key": channel_record.api_key
                       }
            params = {"api_key": channel_record.api_key}
            target_url = channel_record.target_server_ip + "/api/generate_token"
            response = requests.request(
                            "POST",
                            target_url,
                            headers=headers,
                            params=params)
            res_json = response.json()
            if res_json.get("responseCode") and res_json.get("responseCode") == 200:
                res_json_token = res_json.get("Token")
        except Exception as e:
            _logger.debug(f"Error during requesting for the token:{e} and response {response}")
        return res_json_token

    async def async_pos_stock_update(self, channel_record, access_token, payload_data):
        try:
            login_credentials = {"login": channel_record.login, "password": channel_record.password}
            login_credentials = str(login_credentials).replace("'", '"')
            login_credentials_bytes = login_credentials.encode()
            login = base64.b64encode(login_credentials_bytes)
            if isinstance(login, bytes):
                login = login.decode("utf-8")
            headers = {"login": login,
                       "api-key": channel_record.api_key,
                       "token": access_token,
                       "Accept-Encoding": "gzip"}
            target_url = channel_record.target_server_ip + "/api/pos_stock_update"
            # for now payload_data type is dictionary, convert data into str and then to the json
            payload_data = json.dumps(ast.literal_eval(str(payload_data)))
            payload_json_data = json.loads(payload_data)
            async with aiohttp.ClientSession(timeout=timeout) as sess:
                async with sess.put(target_url, headers=headers, json=payload_json_data) as response:
                    if response:
                        res = await response.json()
                        res.update({"target_server": channel_record.target_server_ip,
                                    "payload_to_send": payload_json_data})
                        return res
        except Exception as e:
            _logger.debug(f"Error during updating pos stocks:{e}")

    def pos_stock_update(self, channel_record, access_token, payload_data):
        try:
            login_credentials = {"login": channel_record.login, "password": channel_record.password}
            login_credentials = str(login_credentials).replace("'", '"')
            login_credentials_bytes = login_credentials.encode()
            login = base64.b64encode(login_credentials_bytes)
            headers = {"login": login,
                       "api-key": channel_record.api_key,
                       "token": access_token}
            target_url = channel_record.target_server_ip + "/api/pos_stock_update"
            # for now payload_data type is dictionary, convert data into str and then to the json
            payload_data = json.dumps(ast.literal_eval(str(payload_data)))
            payload_json_data = json.loads(payload_data)
            try:
                response = requests.request(
                                "PUT",
                                target_url,
                                headers=headers,
                                json=payload_json_data)
            except Exception as e:
                _logger.debug(f'Error: {e}')
            res_json = response.json()
            return res_json
        except Exception as e:
            _logger.debug(f"Error during updating pos stocks:{e}")

    def post_pos_stock(self, stock_operation):
        try:
            import time
            start_time = time.time()

            """
            first of all, find the local warehouse records
            get warehouse info setup on the current server
            search all available channel mapping records
            """
            channel_mapping_records = self.env['pos.stock.location.mapping.config'].search([])
            if channel_mapping_records:
                for channel_mapping_record in channel_mapping_records:
                    channel_record_use_to_send = channel_mapping_record
                    
                    local_warehouse = channel_record_use_to_send.local_location
                    local_warehouse_name = None
                    if local_warehouse:
                        local_warehouse_name = local_warehouse.name

                    # get access token
                    access_token = self.get_access_token(channel_record_use_to_send)

                    # collect product data which required to be updated
                    prod_tmpl_id_list = []

                    # iterate through all stock move records and filter out all moves containing local warehouse
                    for move in self:
                        # get current product
                        product_id = move.product_id

                        # get the source and destination locations of current stock move
                        source_location_name = move.location_id.display_name
                        dest_location_name = move.location_dest_id.display_name

                        # find the parent warehouse of these two locations
                        source_location_warehouse_name = move.location_id.warehouse_id.name
                        dest_location_warehouse_name = move.location_dest_id.warehouse_id.name

                        # check if the source location or dest location of stock move contain local warehouse name, if it does
                        # update the stock to another end
                        local_location_id = None
                        if source_location_warehouse_name == local_warehouse_name:
                            local_location_id = move.location_id
                        if dest_location_warehouse_name == local_warehouse_name:
                            local_location_id = move.location_dest_id
                        
                        # when stock moves contain
                        if local_location_id:
                            prod_tmpl_id = product_id.product_tmpl_id.id
                            prod_tmpl_id_context = product_id.product_tmpl_id._context
                            if 'create_from_server_c' in list(prod_tmpl_id_context.keys()):
                                if prod_tmpl_id_context.get('create_from_server_c') == False:
                                   prod_tmpl_id_list.append(prod_tmpl_id)
                            else:
                                prod_tmpl_id_list.append(prod_tmpl_id)
                    
                    # if prod_tmpl_id_list exists, prepar for sending
                    if prod_tmpl_id_list and channel_record_use_to_send:
                        target_stock_loc = channel_record_use_to_send.target_server_location
                        local_stock_loc_id = self.env["stock.location"].search([('display_name', '=', local_warehouse_name)], limit=1)
                        if local_stock_loc_id and target_stock_loc and access_token:
                            try:
                                data = self.env['product.template'].\
                                            search([('id', 'in', prod_tmpl_id_list)]).\
                                            mapped(lambda item: {"prod_tmpl_expr_id": item.get_metadata()[0].get('xmlid'),
                                                                 "pos_stock_loc": target_stock_loc,
                                                                 "quantity": item.with_context({'warehouse': local_warehouse.id,
                                                                                                'location_id': local_warehouse.lot_stock_id.id}).qty_available})
                                # data size is set up as 500
                                chunk_size = 500
                                data_len = len(data)
                                if data_len <= chunk_size:
                                    # If the size of data payload is less than 500, send them normally,
                                    # otherwise cut them into batches, and send them all with aiohttp
                                    pos_stock_payload = {"pos_stock_updates": data}

                                    response = self.pos_stock_update(channel_record_use_to_send, access_token, pos_stock_payload)
                                    _logger.debug(response)

                                    if 'responseCode' in list(response.keys()):
                                        if response.get('responseCode') != 200:
                                            target_server = channel_record_use_to_send.target_server_ip
                                            payload_to_send = json.dumps(pos_stock_payload, indent=4)
                                            self.env['log.note'].sudo().create({
                                                "target_server": target_server,
                                                "record_type": "pos stock update",
                                                "payload_to_send": payload_to_send,
                                                "response_from_target_server": json.dumps(response, indent=4),
                                                "status_code": response.get('responseCode'),
                                                "write_date": str(datetime.now())
                                            })
                                else:
                                    # divide data into chunks
                                    async def update_chunks(data):
                                        chunks = [{"pos_stock_updates": data[i * chunk_size: (i + 1) * chunk_size]} for i in range((len(data) + chunk_size - 1) // chunk_size)]
                                        task_list = [asyncio.create_task(self.async_pos_stock_update(channel_record_use_to_send, access_token, chunk)) for chunk in chunks]
                                        done, pending = await asyncio.wait(task_list, timeout=None)
                                        # get the execution results of the program
                                        for done_task in done:
                                            result_dict = done_task.result()
                                            if 'responseCode' in list(result_dict.keys()):
                                                if result_dict.get('responseCode') != 200:
                                                    # create a new response to remove duplicated items with the same key
                                                    # unique_keys = set(result_dict.keys())
                                                    # new_dict = {key: result_dict[key] for key in unique_keys}
                                                    target_server = str(result_dict.pop('target_server'))
                                                    payload_to_send = json.dumps(result_dict.pop('payload_to_send'), indent=4)
                                                    self.env['log.note'].sudo().create({
                                                        "target_server": target_server,
                                                        "record_type": "pos stock update",
                                                        "payload_to_send": payload_to_send,
                                                        "response_from_target_server": json.dumps(result_dict, indent=4),
                                                        "status_code": result_dict.get('responseCode'),
                                                        "write_date": str(datetime.now())
                                                })
                                    loop_send_to_B = asyncio.new_event_loop()
                                    asyncio.set_event_loop(loop_send_to_B)
                                    loop_send_to_B.run_until_complete(update_chunks(data))
                            except Exception as e:
                                _logger.debug(f"Err during payload sending: {e}")
                    end_time = time.time()
                    _logger.debug(f"Time spent in total:{end_time - start_time}")
        except Exception as e:
            # if exception happened, for prevent it from affecting the normal stock move validation,
            # errors will be ignored
            # pass
            _logger.debug(e)