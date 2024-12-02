# -*- coding: utf-8 -*-
from odoo import models, api, fields
from datetime import datetime,timedelta
import requests


class ResPartner(models.Model):

    _inherit = 'res.partner'

    limited_amount = fields.Float(string="Amount Limit", default=-1)

    def get_pos_amount_current_month(self):
        
        amount_odoo15 = self.authenticate_and_call_api()

        today = fields.Datetime.today()
        first_day = today.replace(day=1)
        last_day = (today.replace(day=1) + timedelta(days=32)).replace(day=1,hour=23,minute=59,second=59) - timedelta(days=1)

        orders_valid = self.pos_order_ids.filtered(lambda item:item.date_order< last_day and item.date_order > first_day)
        if orders_valid:
            total_amount_current_month = orders_valid.mapped(lambda order: order.amount_total)
        else:
            total_amount_current_month = 0,00

        return sum(total_amount_current_month) + amount_odoo15

    def authenticate_and_call_api(self):
        response_return = None
        login_url = 'https://goldencrop15-stage.sprintit.fi/web/session/authenticate'
        payload = {
            'jsonrpc': '2.0',
            'method': 'call',
            'params': {
                'db': 'goldencrop15-stage', 
                'login': 'goldencrop13@gmail.com',
                'password': 'goldencrop1320212022',
            },
        }
        session = requests.Session()
        login_response = session.post(login_url, json=payload)
        if login_response.status_code == 200 and 'result' in login_response.json():
            session_id = session.cookies.get('session_id')
            if not session_id:
                print("Unable to get session_id")
                return
            url = 'https://goldencrop15-stage.sprintit.fi/totalamount/pos'
            headers = {
                'Content-Type': 'application/json',
            }
            data = {
                'params': {
                    'partner_id': 11522,
                },
            }
            response = session.post(url, json=data, headers=headers)
            if response.status_code == 200:
                response_return = (response.json())["result"]["total_amount"]
                print(f'Success: {response_return}')
            else:
                print(f'Failed to call API. Status Code: {response.status_code}, Response: {response.text}')
        else:
            print("Authentication failed")

        return response_return
