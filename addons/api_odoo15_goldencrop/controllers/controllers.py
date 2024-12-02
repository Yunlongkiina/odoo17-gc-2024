# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request


class PricelistManagement(http.Controller):
    @http.route('/pricelist_management/pricelist_management', auth='public')
    def index(self, **kw):
        return "Hello, world"

class AutoLoginHome(http.Controller):
    @http.route("/yunlong/autologin", auth="public")
    def portal_auto_login(self, **kw):
        username = request.params["login"]
        password  = request.params["password"]
        uid = request.session.authenticate(request.session.db, username, password)
        request.params["login_success"] = True
        request.params["password"] = password
        return f'username {username} and password is {password}******Uid is {uid}*********'