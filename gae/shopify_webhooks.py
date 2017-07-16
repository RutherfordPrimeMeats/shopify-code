import logging

import flask

app = flask.Flask(__name__)

@app.route('/shopify_webhooks', methods=['POST'])
def shopify_webhooks():
  return "OK"
