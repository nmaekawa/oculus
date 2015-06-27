$(function() {
  // Localize & shorthand django vars
  var l = window.harvard_md_server;

  var dialogBaseOpts = {
    modal: true,
    draggable: false,
    resizable: false,
    width: "90%",
    classes: "qtip-bootstrap",
    close: function (e) { $(this).remove()}
  };

  // Compile Handlebars templates into t
  var t = {};
  $('script[type="text/x-handlebars-template"]').each(function () {
    t[this.id] = Handlebars.compile(this.innerHTML);
  });

  //print form

  var printPDF = function(e){
    e.preventDefault();
    var d_id = $("#drs_id").val();
    var url = "/proxy/printpdf/" + d_id;
    var xmlhttp;
    var n = $("#n").val();
    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
      xmlhttp=new XMLHttpRequest();
    }
    else {// code for IE6, IE5
      xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }

    var printMode = $('input[name=printOpt]:checked', '#printpds').val();
    var email = $("#email").val();
    var start = $("#start").val();
    var end = $("#end").val();
    if (printMode === "current") {
      url = url + '?n=' + n +'&printOpt=single';
      window.open(url,'');
    } else if (printMode === "range") {
      url = url + '?printOpt=range' + '&start=' + start +
        '&end=' + end + '&email=' + email;
      xmlhttp.open('GET',url,true);
      xmlhttp.send();
    } else  { //all
      url = url + '?printOpt=range' + '&start=' + start +
        '&end=' + end + '&email=' + email;
      xmlhttp.open('GET',url,true);
      xmlhttp.send();
    }
    $('#print-modal').dialog('close');
  };


  Mirador({
    "id": "viewer",
    "layout": l.LAYOUT,
    "saveSession": false,
    "mainMenuSettings" : {
      "buttons": { bookmark: false},
      "userButtons": [
        {"label": "Help",
         "iconClass": "fa fa-question-circle",
         "attributes": { "id": "help", "href": "http://nrs.harvard.edu/urn-3:hul.ois:hlviewerhelp"}},
        {"label": "View in PDS",
         "iconClass": "fa fa-external-link",
         "attributes": { "id": "view-in-pds", "href": "#no-op"}},
        {"label": "Cite",
         "iconClass": "fa fa-quote-left",
         "attributes": { "id": "cite", "href": "#no-op"}},
        {"label": "Search",
         "iconClass": "fa fa-search",
         "attributes": { "id": "search", "href": "#no-op"}},
        {"label": "Print",
         "iconClass": "fa fa-print",
         "attributes": { "id": "print", "href": "#no-op"}},
        {"label": "View Text",
         "iconClass": "fa fa-font",
         "attributes": { "id": "viewtext", "href": "#no-op"}},
        {"label": "Related Links",
         "iconClass": "fa fa-link",
         "attributes": { "id": "links", "href": "#no-op"}},

      ],
    	"userLogo": {
        "label": "Harvard Library",
        "attributes": { "id": "harvard-bug", "href": "http://lib.harvard.edu"}}
    },

    "data": l.MIRADOR_DATA,
    "windowObjects": l.MIRADOR_WOBJECTS
  });

  var ftype_alias = {
    'ImageView': 'i',
    'BookView': 'b',
    'ScrollView': 's',
    'ThumbnailsView': 't'
  };

  var constructUrl = function (omit_id) {
    var object_ids = $.map(Mirador.viewer.workspace.slots, function (slot, i) {
      var mirWindow = slot.window;
      if (mirWindow) {
        var uri = mirWindow.manifest.uri,
            parts = uri.split("/"),
            last_idx = parts.length - 1,
            drs_match = parts[last_idx].match(/drs:(\d+)/),
            drs_id = drs_match && drs_match[1],
            focusType = mirWindow.currentFocus,
            n = mirWindow.focusModules[focusType].currentImgIndex + 1;
        if (drs_match && mirWindow.id !== omit_id) {
          return 'drs:' + drs_id + '$' + n + ftype_alias[focusType]
        }
      }
    });
    return object_ids.join(";");
  };

  var present_choices = function (e) {
    e.preventDefault();
    var op = e.currentTarget.id;
    var choices = $.map(Mirador.viewer.workspace.slots, function (slot, i) {
      var mirWindow = slot.window;
      if (mirWindow) {
        var uri = mirWindow.manifest.uri,
            parts = uri.split("/"),
            last_idx = parts.length - 1,
            drs_match = parts[last_idx].match(/drs:(\d+)/),
            drs_id = drs_match && drs_match[1],
            focusType = mirWindow.currentFocus,
            n = mirWindow.focusModules[focusType].currentImgIndex + 1;
        if (drs_match) {
          console.log("current slotID is: " + slotID); //debug
          return {"label": mirWindow.manifest.jsonLd.label, "drs_id": drs_id,
                  "uri": mirWindow.manifest.uri, "n": n, "slotID": slot.slotID};
        }
      }
      // else omit manifest because we don't know how to cite/view it
    });
    if (choices.length == 1) {
      if (op === 'search') {
        operations[op](choices[0].drs_id, choices[0].n, choices[0].slotID);
        console.log("selecting slotID: " + choices[0].slotID); //debug
      } else {
        operations[op](choices[0].drs_id, choices[0].n);
      }
    }
    else {
      var $dialog = $('#choice-modal');
      if ($dialog.get().length > 0) {
        $dialog.dialog('close');
      }
      else if (choices.length) {
        $dialog = $('<div id="choice-modal" style="display:none" />');
        $dialog.html(t['choices-tmpl']({choices: choices, op: op}));
        $dialog.appendTo('body');
        $dialog.dialog($.extend({title: "Citation"}, dialogBaseOpts)).dialog('open');
        $dialog.find('a').on('click', function (e) {
          e.preventDefault();
          $dialog.dialog('close');
          if (op === 'search') {
            operations[op]($(e.currentTarget).data('drs-id'), $(e.currentTarget).data('n'),
              $(e.currentTarget).data('slotID'));
          } else {
            operations[op]($(e.currentTarget).data('drs-id'), $(e.currentTarget).data('n'));
          }
        });
      }
    }
  };
  var operations = {
    "view-in-pds": function (drs_id, n) {
      window.open(l.PDS_VIEW_URL + drs_id + "?n=" + n);
    },
    "cite": function (drs_id, n) {
      var $dialog = $('#citation-modal');

      if ($dialog.get().length > 0) {
        $dialog.dialog('close');
      }
      else {
        $dialog = $('<div id="citation-modal" style="display:none" />');
        $.getJSON( '/proxy/cite/' + drs_id + '?callback=?', {'n':n})
          .done(function (data) {
            if (data.citation) {
              $dialog.html(t['citation-tmpl'](data.citation));
              $dialog.appendTo('body');
              $dialog
                .dialog($.extend({title: "Citation"}, dialogBaseOpts))
                .dialog('open');
            } //TODO: Else graceful error display
          });
      }
    },
    "search": function(drs_id, n, slotID) {
      var content = { drs_id: drs_id, n: n, slotID: slotID };
      var $dialog = $('#search-modal');
      if ($dialog.get().length > 0) {
        $dialog.dialog('close');
      }
      else {
        $dialog = $('<div id="search-modal" style="display:none" />');
        $dialog.html(t['search-tmpl'](content));
        $dialog
          .dialog($.extend({title: "Search Manifest"}, dialogBaseOpts))
          .dialog('open');

        //init search grid and data sources

        //data source for jq dataadapter
        var fts_source = {
          datatype: "xml",
          datafields: [
            { name: 'label', map: 'displayLabel', type: 'string'},
            { name: 'uri', map: 'deliveryUri', type: 'string'},
            { name: 'context', map: 'context', type: 'string'}
          ],
          root: "resultSet",
          record: "result"
          //pager
        };

        //adapter for search form
        var dataAdapter = new $.jqx.dataAdapter(fts_source, {
          autoBind: false,
          beforeSend: function (xhr) {
             xhr.cache = true;
          }
        });

        //search hitlist
        $("#hitlist").jqxListBox(
        { source: dataAdapter,
          displayMember: "context",
          valueMember: "uri",
          width: 800,
          height: 200,
          renderer: function (index, label, value) {
            var record = dataAdapter.records[index];
            if (record != null) {
                var cell = "<div><i>" + label + "</i><br>" + record.context + "</div>";
                return cell;
            }
            return "";
          }

        });

        $("#hitlist").on('bindingComplete', function (event) {
          if ( dataAdapter.records.length > 0) {
            $('#hits').html("<b>" + dataAdapter.records.length + "</b> Search Results Found");
            $('#nohits').hide();
            $('#hits').show();
            $('#hitlist').show();
          } else {
            $('#hits').hide();
            $('#hits').text('');
            $('#hitlist').hide();
            $('#nohits').show();
          }
        });


        var clearSearch = function () {
          $("#searchbox").val('');
          $('#hitlist').jqxListBox('clear');
          $('#hitlist').hide();
          $('#nohits').hide();
        };

        //handler for select -> move to mirador window
        $("#hitlist").on('select', function (event) {
          if (event.args) {
            var item = event.args.item;
            if (item) {
                var record = dataAdapter.records[item.index];
                var sequence = parseInt((record.uri.split("="))[1]);
                sequence = sequence - 1;
                clearSearch();
                $('#search-modal').dialog('close');
                // TODO - jump active mirador window to this new sequence
                var slotID = $("#search_slotID").val();
                console.log("current slotID is: " + slotID);
                //var slots = Mirador.viewer.workspace.slots;
                var currWindow = Mirador.viewer.workspace.slots[slotID].window;
                var newCanvasID = currWindow.imagesList[sequence].id;
                console.log("old canvasID is: " + currWindow.currentCanvasID);
                console.log("new canvasID is: " + newCanvasID);
                currWindow.setCurrentCanvasID(newCanvasID);
            }
          }
        });

        //handler for automatic search on keyup event in search box
        var me = this;
        $("#searchbox").on("keypress", function (event) {
          if(event.which === 13){
             fts_source.url = "/proxy/find/" + $("#search_drs_id").val() +
                "?Q=" + $("#searchbox").val();
              if (me.timer) clearTimeout(me.timer);
              me.timer = setTimeout(function () {
                dataAdapter.dataBind();
             }, 300);
         }
        });

        //handler for search button
        var me2 = this;
        $("#searchbutton").on("click", function (event) {
           fts_source.url = "/proxy/find/" + $("#search_drs_id").val() +
              "?Q=" + $("#searchbox").val();
            if (me2.timer) clearTimeout(me2.timer);
            me2.timer = setTimeout(function () {
                  dataAdapter.dataBind();
            }, 300);
         });

        //handler for clear searchbox form
        $("#clearsearch").on("click", function (event) {
          clearSearch();
        });
      }
    },
    "print": function(drs_id, n) {
      var content = { drs_id: drs_id, n: n };
      var $dialog = $('#print-modal');

      if ($dialog.get().length > 0) {
        $dialog.dialog('close');
      }
      else {
        $dialog = $('<div id="print-modal" style="display:none" />');
        $dialog.html(t['print-tmpl'](content));
        $dialog
          .dialog($.extend({title: "Convert to PDF for Printing"}, dialogBaseOpts))
          .dialog('open');

        $( "input#pdssubmit" ).click(function(e) {
         e.preventDefault();
         printPDF(e);
        });
      }
    },
    "links": function (drs_id, n) {
      var $dialog = $('#links-modal');

      if ($dialog.get().length > 0) {
        $dialog.dialog('close');
      }
      else {
        $dialog = $('<div id="links-modal" style="display:none" />');
        $.get( '/proxy/related/' + drs_id + '?n=' + n, function(xml){
          var json = $.xml2json(xml);
          if (json.link) {
            // Normalize to array for Handlebars
            if (!json.link.length) { json.link = [json.link]}

            $dialog.html(t['links-tmpl']({links: json.link, op: "links"}));
            $dialog.appendTo('body');
            $dialog
                .dialog($.extend({title: "Related Links"}, dialogBaseOpts))
                .dialog('open');
          }
        }); //TODO: Else graceful error display
      }
    },
    "viewtext": function (drs_id, n) {
      var $dialog = $('#viewtext-modal');

      if ($dialog.get().length > 0) {
        $dialog.dialog('close');
      }
      else {
        $dialog = $('<div id="viewtext-modal" style="display:none" />');
        $.get( '/proxy/get/' + drs_id + '?n=' + n, function(xml){
          var json = $.xml2json(xml);
          if (json.text) {
            $dialog.html(t['viewtext-tmpl']({op: "viewtext", text: json.text}));
            $dialog.appendTo('body');
            $dialog
                .dialog($.extend({title: "View Text"}, dialogBaseOpts))
                .dialog('open');
          }
        }); //TODO: Else graceful error display
      }
    }


  };

  $(document).on('click', "#cite, #view-in-pds, #search, #print, #viewtext, #links", present_choices);

  History.Adapter.bind(window,'statechange',function(){ // Note: We are using statechange instead of popstate
    var State = History.getState(); // Note: We are using History.getState() instead of event.state
  });

  $.subscribe("windowUpdated", function (e, data){
    History.replaceState({}, "State change", constructUrl());
    $.unsubscribe("currentCanvasIDUpdated." + data.id);
    $.subscribe("currentCanvasIDUpdated." + data.id, function (e, cvs_data){
      History.replaceState({}, "State change", constructUrl());
    });
  });

  $.subscribe("windowAdded", function (e, data) {
    $.unsubscribe("currentCanvasIDUpdated." + data.id);
    $.subscribe("currentCanvasIDUpdated." + data.id, function (e, cvs_data){
      History.replaceState({}, "State change", constructUrl());
    });
  });

  $.subscribe("windowRemoved", function (e, data) {
    $.unsubscribe("currentCanvasIDUpdated." + data.id);
    History.replaceState({}, "State change", constructUrl(data.id));
  });



});
