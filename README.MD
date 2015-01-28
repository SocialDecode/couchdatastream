Couch Data Stream
=================

Couch Data Stream is a smart pagination for couchdb that emits several events for the requested data. Also includes self retry for those big couch databases that needs to re-compile their views.

It does not include a couchdriver (maybe future TODO) and it must be passed. Couch Data Stream was designed to work with nano; see [documentation](https://www.npmjs.com/package/nano) on how to use nano.

##Usage

	couchdatastream = require('couchdatastream');
	nano = require('nano');
	
	var couchdb = nano('Your_Couch_Uri');
	var targetDatabase = couchdb.use('Target_Database_Name');
	
	
	paginator = new couchdatastream.ViewPaginator(
		targetDatabase,
		{
			_design : 'your_design_doc',
			_view   : 'your_view'
		},
		{
			startkey     : [],
			endkey       : [],
			limit        : <integer>,
			include_docs : <bool>
			reduce       : <bool>
		}
	)
	
	paginator.on('rows',function(rows){
		//Do something with your results

		paginator.next();
	});
	
	paginator.on('error',function(err){
		//Handle here the error

		paginator.end();
	});
	
	paginator.on('end',function(){
		//we are done here
	});
	
	//start the pagination
	paginator.next();

	
##TODO
- Add nano inside the package and require less things
- Rewrite the code as coffeescript (maybe litcoffee)
	
##Changelog

###0.15.128-b
Some info on the README was missing

###0.15.128-a
Initial release, couchforce added to ViewPaginator routine


##Credits
At no specific order

- [Ignacio](https://github.com/castci)
- [Salvador Aceves](https://github.com/xalakox)
- [Zero Dragon](https://github.com/zerodragon)