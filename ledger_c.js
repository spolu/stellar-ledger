/*
 * Stellar Ledger: ledger_c.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-08-06 spolu  Creation
 */
'use strict'

// ### ledger_c
//
// ```
// @spec { ledger_el }
// ```
var ledger_c = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.ledger_el = spec.ledger_el || $('.ledger');
  my.latest_el = my.ledger_el.find('.latest');;

  my.protocol = location.protocol == 'https:' ? 'wss:' : 'ws:';
  my.network = my.protocol + '//live.stellar.org:9001';
  my.domain = 'stellar.org';
  my.connection = null;

  my.request_pending = {};
  my.request_next_id = 0;

  my.transaction_handlers = [];


  //
  // ### _public_
  //
  var init;               /* init(); */

  //
  // ### _private_
  //
  var request;
  var message_handler;

  //
  // ### _that_
  //
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### request
  //
  // Performs a request over WebSocket by registering the request id and
  // returning a callback
  request = function(command, params, cb_) {
    var request = params;
    request.command = command;
    request.id = ++my.request_next_id;
    if(cb_) {
      my.request_pending[request.id] = cb_;
    }
    my.connection.send(JSON.stringify(request));
  };

  // ### message_handler
  //
  // Message handler from the WebSocket
  message_handler = function(msg) {
    //console.log(msg);
    if(msg.data) {
      try {
        var data = JSON.parse(msg.data);
      }
      catch (err) {}
      if(data && my.request_pending[data.id]) {
        var cb_ = my.request_pending[data.id];
        delete my.request_pending[data.id];
        if(data.status === "success") {
          return cb_(null, data.result);
        }
        if(data.status === "error") {
          return cb_(new Error(data.error_message));
        }
      }
      else if(data) {
        if(data.type === "transaction") {
          my.transaction_handlers.forEach(function(hdlr) {
            hdlr(data.transaction);
          });
        }
      }
    }
  };

  /**************************************************************************/
  /* PUBLIC METHODS */
  /**************************************************************************/
  // ### init
  //
  // Initialises the controller
  init = function() {
    my.connection = new WebSocket(my.network);
    my.connection.onopen = function() {
      console.log('OPEN');
      /*
      request("account_info", { 
        "account": "gM4Fpv2QuHY4knJsQyYGKEHFGw3eMBwc1Ua" 
      }, function(err, data) {
        console.log(err);
        console.log(data);
      });
      */

      request("subscribe", {
        "streams": [ "transactions_rt" ]
      });
    };
    my.connection.onclose = function() {
      console.log('CLOSE');
    };
    my.connection.onmessage = message_handler;

    my.transaction_handlers.push(function(txn) {
      var html = '';
      html += '<tr>';
      html += '  <td>' + txn.hash.substr(0, 6) + '</td>'
      html += '  <td>' + txn.TransactionType + '</td>'
      html += '  <td>' + txn.Account + '</td>'
      html += '  <td>' + txn.Fee + '</td>'
      html += '  <td>' + (txn.Destination || '') + '</td>'
      html += '  <td>' + (txn.Amount || '') + '</td>'
      html += '</tr>';

      var body = my.latest_el.find('.latest-body');
      body.prepend(html);
      if(body.find('tr').length > 20) {
        body.find('tr').last().remove();
      }
      console.log(txn);
    });
  }

  that.init = init;

  return that;
};
