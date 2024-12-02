import hashlib
import logging
import os
from datetime import datetime, timedelta
from dateutil import relativedelta

from odoo import api, fields, models
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT

_logger = logging.getLogger(__name__)


def nonce(length=40, prefix="access_token"):
    rbytes = os.urandom(length)
    return "{}_{}".format(prefix, str(hashlib.sha1(rbytes).hexdigest()))


class APIAccessToken(models.Model):
    _name = "api.access_token"
    _description = "API Access Token"

    token = fields.Char("Access Token", required=True)
    user_id = fields.Many2one("res.users", string="User", required=True)
    scope = fields.Char(string="Scope")
    create_date = fields.Datetime(
        string="Creation Date", 
        readonly=True,
        default = datetime.now(),
    )
    expiration_date = fields.Datetime(
        string="Expiration Date",
        readonly=True,
    )

    def find_one_or_create_token(self, user_id=None, create=False):
        #test_token_valid_hours = 24
        token_valid_hours = 2400000
        expiration_date = datetime.now() + relativedelta.relativedelta(hours=int(token_valid_hours))

        if not user_id:
            user_id = self.env.user.id

        access_token = self.env["api.access_token"].sudo().search([
            '&',("user_id", "=", user_id),
                ('expiration_date', '>', fields.Datetime.now())],
                order="id DESC", limit=1)

        if not access_token and create:
            vals = {
                "user_id": user_id,
                "scope": "userinfo",
                "token": nonce(50),
                "create_date": datetime.now(),
                "expiration_date":expiration_date
            }
            access_token = self.env["api.access_token"].sudo().create(vals)
        if not access_token:
            return None
        return access_token.token

    def _allow_scopes(self, scopes):
        self.ensure_one()
        if not scopes:
            return True

        provided_scopes = set(self.scope.split())
        resource_scopes = set(scopes)

        return resource_scopes.issubset(provided_scopes)

    @api.autovacuum
    def _autovacuum_expired_token(self):
        limit_date = fields.Datetime.now()
        self.search([('expiration_date', '<', limit_date)]).unlink()
        
class Users(models.Model):
    _inherit = "res.users"
    token_ids = fields.One2many("api.access_token", "user_id", string="Access Tokens")
