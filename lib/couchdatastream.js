var events = require('events'),
    util   = require('util'),
    async  = require('async');

///////////////////////////////////////////////////////////////////////////
// Pagination algorithm from guide.couchdb.org://
//
// - Request 'count' + 1 rows from the view
//
// - Emit 'count' rows, store + 1 row as next _startkey and _startkey_docid
//
// - Use the _next_* values to query the subsequent pages
//
// - http://docs.couchdb.org/en/latest/couchapp/views/pagination.html#views-pagination
///////////////////////////////////////////////////////////////////////////

/**
 * Paginator
 * @param db nano Object
 * @param query Object
 */
displayLogs = true;
exports.displayLogs = function(flag){
  displayLogs = flag;
};
var ListPaginator = function ListPaginator(db, query) {
  events.EventEmitter.call(this);
  this.init(db, query);
};

util.inherits(ListPaginator, events.EventEmitter);

ListPaginator.prototype.init = function(db, query) {
  this.db    = db;
  this.query = query;
  this.query.limit = query.limit + 1 || 11;
  this.pageSize    = this.query.limit;
  this._done       = false;
  this._startkey   = this.query.startkey || 0;
  this._startkey_docid = this.query.startkey_docid || 0;
};

ListPaginator.prototype.end = function() {
  this.db = null;
  this.removeAllListeners();
};

ListPaginator.prototype.next = function(count){
  if (this._done) {
    this.emit('end');
    return;
  }

  count = count || this.pageSize - 1;
  this.query.startkey_docid = this._startkey_docid;
  this.query.startkey = this._startkey;
  this.db.list(this.query, function(err, docs) {
    if (err) {
      this.emit('error', err);
      return;
    }
    try{
      var rows = docs.rows.length;
      if (rows < count + 1) {
        // Read last docs in db
        this._done = true;
        this.emit('rows', docs.rows);
      } else {
        var nextStartDoc = docs.rows[rows-1];
        this._startkey_docid = nextStartDoc.id;
        this._startkey = nextStartDoc.key;
        this.emit('rows', docs.rows.slice(0, count));
      }
      docs.rows = [];
    }
    catch(e){
      this.emit('error', e);
      return;
    }
  }.bind(this));
};

/**
 * Paginator
 * @param db nano Object
 * @param view Object  define the view {_design : "", _view:""}
 * @param query Object
 */
var Paginator = function Paginator(db, view, query) {
  events.EventEmitter.call(this);
  this.init(db, view, query);
};

util.inherits(Paginator, events.EventEmitter);

Paginator.prototype.init = function(db, view, query) {
  this.db    = db;
  this.view  = view;
  this.query = query;
  this.query.limit = query.limit + 1 || 11;
  this.pageSize    = this.query.limit;
  this._done       = false;
  this._startkey   = this.query.startkey || 0;
  this._startkey_docid = this.query.startkey_docid || 0;
};

Paginator.prototype.end = function() {
  this.db = null;
  this.removeAllListeners();
};

/**
*
* couchForce doest not callbacks until it gets the view error-less
*
**/
var couchForce = function(database,doc,view,query,callback){
  var retbody = false,
    dmesg = database.config.db;
  async.whilst(
    function () { return retbody === false;},
    function (cback) {
      if(displayLogs)
        console.log(dmesg+" ?");
      database.view(doc, view, query, function(err, body) {
        if (err) {
          if (err.statusCode !=  404){
            if(displayLogs)
              console.log(err.statusCode, err.message, dmesg+" retrying...");
          }else{
            //404
            if(displayLogs)
              console.log(err.statusCode, err.message, dmesg+" skipping...");
            retbody = {rows:[]};
          }
        }else{
          if (typeof body !== "object" || !(body.rows instanceof Array)) {
            var reason ="";
            if (typeof body !== "object") {
              reason = "body is "+(typeof body)+"..";
            }else if (!(body.rows instanceof Array)){
              reason = "body.rows is not an instanceof Array, is a "+(typeof body.rows)+"..";
            }
            if(displayLogs)
              console.log(dmesg+" invalid response :|",reason);
          }else{
            if(displayLogs)
              console.log(dmesg+" ok !");
            retbody = body; //break the loop
          }
        }
        cback();
      });
    },
    function (errdone) {
      //all done !
      callback(null,retbody);
    }
  );
};

Paginator.prototype.next = function(count) {
  if (this._done) {
    this.emit('end');
    return;
  }

  count = count || this.pageSize - 1;

  this.query.startkey_docid = this._startkey_docid;
  this.query.startkey = this._startkey;
  couchForce(this.db, this.view._design, this.view._view, this.query, function(err,docs){
    if (err) {
      this.emit('error', err);
      return;
    }

    try{
      var rows = docs.rows.length;
      if(rows < count + 1){
        // Read last docs in db
        this._done = true;
        this.emit('rows', docs.rows);
      }
      else{
        var nextStartDoc = docs.rows[rows-1];
        this._startkey_docid = nextStartDoc.id;
        this._startkey = nextStartDoc.key;
        this.emit('rows', docs.rows.slice(0, count));
      }
      docs.rows = [];
    }
    catch(e){
      this.emit('error', e);
      return;
    }
  }.bind(this));
  // this.db.view(this.view._design, this.view._view, this.query, function(err, docs) {

  // }.bind(this));
};

exports.ListPaginator = ListPaginator;
exports.ViewPaginator = Paginator;
