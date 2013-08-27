

//CONST- CHANGE ALL THESE TO TELL SOLRSTRAP ABOUT THE LOCATION AND STRUCTURE OF YOUR SOLR

var SERVERROOT = 'http://evolvingweb.ca/solr/reuters/select/'; //SELECT endpoint
var HITTITLE = 'title';                                        //Name of the title field- the heading of each hit
var HITBODY = 'text';                                          //Name of the body field- the teaser text of each hit
var HITSPERPAGE = 20;                                          //page size- hits per page
var FACETS = ['topics','organisations'];                       //facet categories

var FACETS_TITLES = {'topics': 'subjects'};  // selective rename facet names for display

var HITID = 'id'		// Name of the id field
var HITTEASER = 'teaser';	// Name of field to use for teaser
var HITLINK = 'url';		// Name of field to use for link

var HL = true;
var HL_FL = 'text, title';
var HL_SIMPLE_PRE = '<em>';
var HL_SIMPLE_POST = '</em>';
var HL_SNIPPETS = 3;

var AUTOSEARCH_DELAY = 0;

//when the page is loaded- do this
  $(document).ready(function() {
    $('#solrstrap-hits').append('<div offset="0"></div>');
    $('#solrstrap-searchbox').attr('value', getURLParam('q'));
    $('#solrstrap-searchbox').focus();
    //when the searchbox is typed- do this
    $('#solrstrap-searchbox').keyup(keyuphandler);
    $('form.navbar-search').submit(handle_submit);
    $(window).bind('hashchange', hashchange);
    $('#solrstrap-searchbox').bind("change", querychange);
    hashchange();
  });

  //jquery plugin allows resultsets to be painted onto any div.
  (function( $ ){
    $.fn.loadSolrResults = function(q, fq, offset) {
      $(this).getSolrResults(q, fq, offset);
    };
  })( jQuery );


  //jquery plugin allows autoloading of next results when scrolling.
  (function( $ ){
    $.fn.loadSolrResultsWhenVisible = function(q, fq, offset) {
      elem = this;
      $(window).scroll(function(event){
        if (isScrolledIntoView(elem) && !$(elem).attr('loaded')) {
          //dont instantsearch and autoload at the same time
          if ($('#solrstrap-searchbox').val() != getURLParam('q')) {
	    handle_submit();
          }
          $(elem).attr('loaded', true);
          $(elem).getSolrResults(q, fq, offset);
          $(window).unbind('scroll');
        }
      });
    };
  })( jQuery );


  //jquery plugin for takling to solr
  (function( $ ){
    var TEMPLATES = {
    'hitTemplate':Handlebars.compile($("#hit-template").html()),
    'summaryTemplate':Handlebars.compile($("#result-summary-template").html()),
    'navTemplate':Handlebars.compile($("#nav-template").html()),
    'chosenNavTemplate':Handlebars.compile($("#chosen-nav-template").html())
    };
    Handlebars.registerHelper('facet_displayname', function(facetname) {
	return((FACETS_TITLES && FACETS_TITLES.hasOwnProperty(facetname)) ?
	       FACETS_TITLES[facetname] : facetname);
      });
    $.fn.getSolrResults = function(q, fq, offset) {
      var rs = this;
      $(rs).parent().css({ opacity: 0.5 });
      $.ajax({url:SERVERROOT,
	    dataType: 'jsonp',
	    data: buildSearchParams(q, fq, offset), 
	    traditional: true,
	    jsonp: 'json.wrf',
	    success: 
	  function(result){
	    // console.log(result);
	    //only redraw hits if there are new hits available
	    if (result.response.docs.length > 0) {
	      if (offset == 0) {
		rs.empty();
		//strapline that tells you how many hits you got
		rs.append(TEMPLATES.summaryTemplate({totalresults: result.response.numFound, query: q}));
		rs.siblings().remove();
	      }
	      //draw the individual hits
	      for (var i = 0; i < result.response.docs.length; i++) {
		var title = normalize_ws(get_maybe_highlit(result, i, HITTITLE));
		  var text = normalize_ws(get_maybe_highlit(result, i, HITBODY));
		  var teaser = normalize_ws(get_maybe_highlit(result, i, HITTEASER));
		var link = result.response.docs[i][HITLINK];
	      
		var hit_data = {title: title, text: text};

		if (teaser) {
		  hit_data['teaser'] = teaser;
		}
		if (link) {
		  hit_data['link'] = link;
		}

		rs.append(TEMPLATES.hitTemplate(hit_data));
	      }
	      $(rs).parent().css({ opacity: 1 });
	      //if more results to come- set up the autoload div
	      if ((+HITSPERPAGE+offset) < +result.response.numFound) {
		var nextDiv = document.createElement('div');
		$(nextDiv).attr('offset', +HITSPERPAGE+offset);
		rs.parent().append(nextDiv);
		$(nextDiv).loadSolrResultsWhenVisible(q, fq, +HITSPERPAGE+offset);
	      }
	      //facets
	      $('#solrstrap-facets').empty();
	      //chosen facets
	      if (fq.length > 0) {
		var fqobjs = [];
		for (var i = 0; i < fq.length; i++) {
		  var m = fq[i].match(/^([^:]+):(.*)/);
		  if (m) {
		    fqobjs.push({'name': m[1], 'value': m[2]});
		  }
		}
		$('#solrstrap-facets').append(TEMPLATES.chosenNavTemplate(fqobjs));
	      }
	      //available facets
	      for (var k in result.facet_counts.facet_fields) {
		if (result.facet_counts.facet_fields[k].length > 0) {
		  $('#solrstrap-facets')
		    .append(TEMPLATES.navTemplate({
			title: k,
			    navs:
			  makeNavsSensible(result.facet_counts.facet_fields[k])}));
		}
	      }
	      $('div.facet > a').click(add_nav);
	      $('div.chosen-facet > a').click(del_nav);
	    }
	  }});
    };
  })( jQuery );


  //translates the ropey solr facet format to a more sensible map structure
  function makeNavsSensible (navs) {
    var newNav = {};
    for (var i = 0; i < navs.length; i+=2) {
      newNav[navs[i]] = navs[i + 1];
    }
    return newNav;
  }

  //utility function for grabbling URLs
  function getURLParam(name) {
    var ret = $.bbq.getState(name);
    return ret;
  }

  //function to generate an array of URL parameters, where there are likely to be several params with the same key
  function getURLParamArray(name) {
    var ret =  $.bbq.getState(name) || [];
    if (typeof(ret) == 'string')
      ret = [ret];
    return ret;
  }

  //utility function that checks to see if an element is onscreen
  function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
  }

  function buildSearchParams(q, fq, offset) {
    var ret = { 
    'rows': HITSPERPAGE,
    'wt': 'json',
    'q': q,
    'start': offset
    }
    if (FACETS.length > 0) {
      ret['facet'] = 'true';
      ret['facet.mincount'] = '1';
      ret['facet.limit'] = '20';
      ret['facet.field'] = FACETS;
    }
    if (fq.length > 0) {
      ret['fq'] = fq;
    }
    if (HL_FL) {
      ret['hl'] = 'true';
      ret['hl.fl'] = HL_FL;
      ret['hl.simple.pre'] = HL_SIMPLE_PRE;
      ret['hl.simple.post'] = HL_SIMPLE_POST;
      ret['hl.snippets'] = HL_SNIPPETS;
    }
    return ret;
  }

  //optionally convert a string array to a string, by concatenation
  function array_as_string(array_or_string)
  {
    var ret = '';
    if (typeof(array_or_string) == 'string') {
      ret = array_or_string;
    }
    else if (typeof(array_or_string) == 'object' 
	     && array_or_string.hasOwnProperty('length') 
	     && array_or_string.length > 0) {
      ret = array_or_string.join(" ... ");
    }
    return ret;
  }

  //normalize a string with respect to whitespace:
  //1) Remove all leadsing and trailing whitespace
  //2) Replace all runs of tab, space and &nbsp; with a single space
  function normalize_ws(string) 
  {
    return string.replace(/^\s+/, '')
      .replace(/\s+$/, '')
      .replace(/(?: |\t|&nbsp;|&#xa0;|\xa0)+/g, ' '); 
  }


  //get field from result for document i, optionally replacing with
  //highlit version
  function get_maybe_highlit(result, i, field) 
  {
    var res = result.response.docs[i][field];
    if (HL) {
      var id = result.response.docs[i][HITID];
      var hl_map = result.highlighting[id];
      if (hl_map.hasOwnProperty(field)) {
	res = hl_map[field];
      }
    }

    return array_as_string(res);
  }

  //handler for navigator selection
  function add_nav(event) 
  {
    var whence = event.target;
    var navname = $(whence).closest("div.facet").children("span.nav-title").data("facetname");
    var navvalue = $(whence).text();
    var newnav = navname + ':"' + navvalue.replace(/([\\\"])/g, "\\$1") + '"';
    var fq = getURLParamArray("fq");

    // check if it already exists...
    var existing = $.grep(fq, function(elt, idx) {
	return elt === newnav;
      });

    if (existing.length === 0) {
      fq.push(newnav);
      $.bbq.pushState({'fq': fq});
    }
    return false;
  }

  //handler for navigator de-selection
  function del_nav(event) 
  {
    var whence = event.target;
    if ($(whence).hasClass("close")) {
      whence = $(whence).next();
    }
    // var filter = $(whence).text();
    var filter = $(whence).data("filter");    
    var fq = getURLParamArray("fq");

    fq = $.grep(fq, function(elt, idx) {
	return elt === filter;
      }, true);
    $.bbq.pushState({"fq": fq});
    return false;
  }

  function hashchange(event)
  {
    $('#solrstrap-hits div[offset="0"]').loadSolrResults(getURLParam('q'), getURLParamArray('fq'), 0);
  }

  function handle_submit(event)
  {
    var q = $.trim($('#solrstrap-searchbox').val());
    if (q !== '') {
      $.bbq.removeState("fq");
      $.bbq.removeState("q");
      $.bbq.pushState({'q': q});
    }
    return false;
  }

  var querychange = handle_submit;

  var timeoutid;
  function keyuphandler()
  {
    if (timeoutid) {
      window.clearTimeout(timeoutid);
    }
    timeoutid = window.setTimeout(maybe_autosearch, AUTOSEARCH_DELAY);
  }

  function maybe_autosearch()
  {
    if (timeoutid) {
      window.clearTimeout(timeoutid);
    }
    var q = $.trim($('#solrstrap-searchbox').val());
    if (q.length > 3 && q !== getURLParam("q")) {
      $('#solrstrap-hits div[offset="0"]').loadSolrResults(q, [], 0);
    }
    else {
      // $('#solrstrap-hits').css({ opacity: 0.5 });
    }
  }

