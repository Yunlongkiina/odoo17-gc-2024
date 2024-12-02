from odoo import api, fields, models, _
from odoo.exceptions import UserError


class OdooQuery(models.Model):
    _name = "odoo.query"
    _description = "Odoo Query"

    html = fields.Html(string='HTML')
    query = fields.Text(string='Query', default='select name, email from res_partner')
    output_type = fields.Selection([('formatted', 'Formatted'), ('raw', 'Raw')], string='Output Type', default='formatted')
    raw_output = fields.Text(string='Raw Output')

    def action_clear(self):
        self.query = ''
        self.html = ''
        self.raw_output = ''
        self.output_type = 'formatted'

    def action_execute(self):
        self.raw_output = ''
        self.html = '<br></br>'
        if self.query:
            headers = []
            datas = []
            try:
                self.env.cr.execute(self.query)
            except Exception as e:
                raise UserError(e)
            try:
                no_fetching = ['update', 'delete', 'create', 'insert', 'alter', 'drop']
                max_n = len(max(no_fetching))
                is_insides = [(o in self.query.lower().strip()[:max_n]) for o in no_fetching]
                if True not in is_insides:
                    headers = [d[0] for d in self.env.cr.description]
                    datas = self.env.cr.fetchall()
            except Exception as e:
                raise UserError(e)
            if headers and datas:
                self.raw_output = datas

                header_html = "".join(["<th style='border: 1px solid'>"+str(header)+"</th>" for header in headers])
                header_html = "<tr>"+"<th style='background-color:white !important'/>"+header_html+"</tr>"

                body_html = ""
                i = 0
                for data in datas:
                    i += 1
                    body_line = "<tr>"+"<td style='border-right: 3px double; border-bottom: 1px solid; background-color: #b3cccc'>{0}</td>".format(i)
                    for value in data:
                        body_line += "<td style='border: 1px solid; background-color: {0}'>{1}</td>".format('cyan' if i%2 == 0 else 'white', str(value) if (value is not None) else '')

                    body_line += "</tr>"
                    body_html += body_line

                self.html = """
<table style="text-align: center">
  <thead style="background-color: lightgrey">
    {0}
  </thead>

  <tbody>
    {1}
  </tbody>
</table>
""".format(header_html, body_html)
