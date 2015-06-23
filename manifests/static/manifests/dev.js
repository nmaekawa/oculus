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
    var url = l.PDS_WS_URL + "printpdf/" + d_id;
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
    'ThumbnailView': 't'
  };

  var constructUrl = function () {
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
        if (drs_match) {
          return 'drs:' + drs_id + '|' + n + ftype_alias[focusType]
        }
      }
    });
    return object_ids.join(";");
  };

  jQuery.subscribe("currentCanvasIDUpdated", function (e) {
    console.log(constructUrl());
  });

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
          return {"label": mirWindow.manifest.jsonLd.label, "drs_id": drs_id, "uri": mirWindow.manifest.uri, "n": n};
        }
      }
      // else omit manifest because we don't know how to cite/view it
    });
    if (choices.length == 1) {
      operations[op](choices[0].drs_id, choices[0].n);
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
          operations[op]($(e.currentTarget).data('drs-id'), $(e.currentTarget).data('n'));
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
        $.getJSON( l.PDS_WS_URL + 'cite/' + drs_id + '?callback=?', {'n':n})
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
    "search": function(drs_id, n) {
      var content = { drs_id: drs_id, n: n };
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
            { name: 'context', map: 'context', type: 'string'},
          ],
          //url: l.PDS_WS_URL + "find/",
          root: "resultSet",
          record: "result"
          //pager
        };

        //adapter for search form
        var dataAdapter = new $.jqx.dataAdapter(fts_source, {
          autoBind: false,
          beforeSend: function (xhr) {
             xhr.cache = true;
             /*fts_source.url = l.PDS_WS_URL + "find/" + $("#search_drs_id").val() +
             "?Q=" + $("#searchbox").val() + "&F=M";*/
          }
        });

        //search hitlist
        $("#hitlist").jqxListBox(
        { source: dataAdapter,
          displayMember: "context",
          valueMember: "uri",
          width: 600,
          autoHeight: true,
          renderer: function (index, label, value) {
            var cell = "<div style='margin: 5px; float:left;word-wrap: break-word; height: auto; overflow-x: auto;'>"+ label +"<hr size='1'></div>";
            return cell;
          }

       });

        //handler for select -> move to mirador window
        $("#hitlist").on('select', function (event) {
        if (event.args) {
          var item = event.args.item;
          if (item) {
              var seq =  item.value;
              // TODO - jump active mirador window to this new seq
              console.log("search: jumping to sequence");
              $("#searchbox").val('');
              $('#hitlist').jqxListBox('clear');
              $('#hitlist').hide();
              $('#search-modal').dialog('close');
            }
          }
        });

        //handler for automatic search on keyup event in search box
        var me = this;
        $("#searchbox").on("keypress", function (event) {
          if(event.which === 13){
             fts_source.url = l.PDS_WS_URL + "find/" + $("#search_drs_id").val() +
                "?Q=" + $("#searchbox").val();
              if (me.timer) clearTimeout(me.timer);
             me.timer = setTimeout(function () {
                dataAdapter.dataBind();
             }, 300);
             $('#hitlist').show();
             $('#hitlist').jqxListBox('refresh');
         }
        });

        //handler for clear searchbox form
        $("#clearsearch").on("click", function (event) {
          $("#searchbox").val('');
          $('#hitlist').jqxListBox('clear');
          $('#hitlist').hide();
        });
      }
    },
    "print": function(drs_id, n) {
      console.log("print" + drs_id);
      var content = { drs_id: drs_id, n: n };
      var $dialog = $('#print-modal');

      if ($dialog.get().length > 0) {
        $dialog.dialog('close');
      }
      else {
        $dialog = $('<div id="print-modal" style="display:none" />');
        $dialog.html(t['print-tmpl'](content));
        $dialog
          .dialog($.extend({title: "Print Manifest"}, dialogBaseOpts))
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
        $.get( l.PDS_WS_URL + 'related/' + drs_id + '?n=' + n, function(xml){
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
        $.get( l.PDS_WS_URL + 'get/' + drs_id + '?n=' + n, function(xml){
          var json = $.xml2json(xml);
          if (json.text) {
            //debug
            console.log(json.text);
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



});
