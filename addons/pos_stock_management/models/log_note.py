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

class LogNote(models.Model):
    _name = "log.note"
    _order = 'write_date desc'

    target_server = fields.Char(string="Target Server to Send", store=True)
    record_type = fields.Char(string="Payload Type", store=True)
    payload_to_send = fields.Text(string="Payload to Send", store=True)
    response_from_target_server = fields.Text(string="Reponse from Target Server", store=True)
    status_code = fields.Char(string="Status Code", store=True)
    write_date = fields.Char(string="Write Date", store=True)
    

    

    