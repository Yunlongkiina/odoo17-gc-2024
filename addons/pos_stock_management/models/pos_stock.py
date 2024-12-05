import logging
import base64
import json
import ast
import requests
import asyncio
import aiohttp
from odoo import api,fields,models
from odoo.exceptions import ValidationError
from logging import getLogger
from datetime import datetime

_logger = logging.getLogger(__name__)

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

# setup aiohttp timeout
timeout = aiohttp.ClientTimeout(total=60)

class PosStock(models.Model):
    _name = "pos.stock"
    _description = "Multiple Stocks Setup to Display"

    prod_tmpl_id = fields.Many2one('product.template', string="Product Templates")
    prod_prod_id = fields.Many2one('product.product', string="Product Product")
    location = fields.Char(string="Location")
    available_quantity = fields.Float("On Hand",
                                      help="qty >  0 - stock is available for querying<br> \
                                      qty = 0 - default values setup for qty<br> \
                                      qty = -1 - stock not available from other servers, please review the settings")

    def get_access_token(self, channel_record):
        # get the access token first
        # prepare the headers first (be sure to add escape characters)
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
                            params=params,
                            timeout=(3,5))      # setup timeout, connection 3s, read 5s
            _logger.debug(response.text)
            res_json = response.json()
            _logger.debug(res_json)
            if res_json.get("responseCode") and res_json.get("responseCode") == 200:
                return res_json.get("Token")
        except Exception as e:
            _logger.debug(f"Error during requesting for the token:{e} and response {response}")

    async def pos_stock_update(self, channel_record, access_token, payload_data):
        try:
            login_credentials = {"login": channel_record.login, "password": channel_record.password}
            login_credentials = str(login_credentials).replace("'", '"')
            login_credentials_bytes = login_credentials.encode()
            login = base64.b64encode(login_credentials_bytes)
            if isinstance(login, bytes):
                login = login.decode("utf-8")
            headers = {"login": login,
                       "api-key": channel_record.api_key,
                       "token": access_token}
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

    def _daily_cron_sync_pos_non_zero_stock_to_middleware(self):
        try:
            pass
        except Exception as e:
            _logger.debug(e)
        _logger.debug("Function is called!!!!")

    """
    Created by Tuo Yang 2024-02-15
    Build the function used for distributing contents to all available ends on B server
    """
    async def send_to_all_B_server(self, pos_stock_records):
        try:
            if pos_stock_records:
                # check all available channels setup in webhook Multiple Stock Mapping
                available_channels = self.sudo().env['pos.stock.location.mapping.config'].search([])
                if available_channels:
                    payload_to_send = {"pos_stock_updates": pos_stock_records}
                    task_list = []
                    for available_channel in available_channels:
                        access_token = None
                        # To prevent the token becomes invalid during the transfering process, directly requesting
                        # the token from the target server instead of using the one setup in mapping records
                        is_middle_server_or_not = self.env['ir.config_parameter'].sudo().get_param('is_middle_server_or_not')
                        if is_middle_server_or_not:
                            access_token = self.get_access_token(available_channel)
                        else:
                            if available_channel.access_token:
                                access_token = available_channel.access_token
                            else:
                                access_token = self.get_access_token(available_channel)
                        task = asyncio.create_task(self.pos_stock_update(available_channel, access_token, payload_to_send))
                        task_list.append(task)
                    done, pending = await asyncio.wait(task_list, timeout=None)
                    result_dict = {}
                    # get the execution results of the program
                    for done_task in done:
                        # write the data
                        result_dict.update(done_task.result())
                    if 'responseCode' in list(result_dict.keys()):
                        if result_dict.get('responseCode') != 200:
                            # create a new response to remove duplicated items with the same key
                            unique_keys = set(result_dict.keys())
                            new_dict = {key: result_dict[key] for key in unique_keys}
                            target_server = str(new_dict.pop('target_server'))
                            payload_to_send = json.dumps(new_dict.pop('payload_to_send'), indent=4)
                            self.env['log.note'].sudo().create({
                                "target_server": target_server,
                                "record_type": "pos stock update",
                                "payload_to_send": payload_to_send,
                                "response_from_target_server": json.dumps(new_dict, indent=4),
                                "status_code": result_dict.get('responseCode'),
                                "write_date": str(datetime.now())
                            })
                    # list(map(lambda available_channel: self.map_sending_through_channels(available_channel, pos_stock_records), available_channels)) 
        except Exception as e:
            _logger.debug(f"Error in the func send_to_all_B_server: {e}")
        
