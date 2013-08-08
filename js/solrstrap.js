

//CONST- CHANGE ALL THESE TO TELL SOLRSTRAP ABOUT THE LOCATION AND STRUCTURE OF YOUR SOLR
var SERVERROOT = 'http://evolvingweb.ca/solr/reuters/select/'; //SELECT endpoint
var HITTITLE = 'title';                                        //Name of the title field- the heading of each hit
var HITBODY = 'text';                                          //Name of the body field- the teaser text of each hit
var HITSPERPAGE = 20;                                          //page size- hits per page
var FACETS = ['topics','organisations'];                       //facet categories


//when the page is loaded- do this
  $(document).ready(function() {
    $('#solrstrap-hits').append('<div offset="0"></div>');
    $('#solrstrap-hits div[offset="0"]').loadSolrResults(getURLParam('q'), getURLParamArray('fq'), 0);
    $('#solrstrap-searchbox').attr('value', getURLParam('q'));
    $('#solrstrap-searchbox').focus();
  });

//when the searchbox is typed- do this
  $('#solrstrap-searchbox').keyup(function() {
    if ($(this).val().length > 3) {
      $('#solrstrap-hits div[offset="0"]').loadSolrResults($(this).val(), getURLParamArray('fq'), 0);
    }
    else {
      $('#solrstrap-hits').css({ opacity: 0.5 });
    }
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
            window.location = 'solrstrap.html?q=' + $('#solrstrap-searchbox').val();
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
    $.fn.getSolrResults = function(q, fq, offset) {
      var TEMPLATES = {
        'hitTemplate':Handlebars.compile($("#hit-template").html()),
        'summaryTemplate':Handlebars.compile($("#result-summary-template").html()),
        'navTemplate':Handlebars.compile($("#nav-template").html()),
        'chosenNavTemplate':Handlebars.compile($("#chosen-nav-template").html())
      }
      var rs = this;
      $(rs).parent().css({ opacity: 0.5 });
      $.getJSON(getSearchURL(q, offset),
        function(result){
          console.log(result);
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
	      var title = get_maybe_highlit(result, i, HITTITLE);
	      var text = get_maybe_highlit(result, i, HITBODY);
	      var teaser = get_maybe_highlit(result, i, HITTEASER);
	      var link = result.response.docs[i][HITLINK];
	      
              rs.append(TEMPLATES.hitTemplate({title: title, teaser: teaser,
		      text: text,
		      link: link}));
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
              var chosenNavs = {};
              for (var i = 0; i < fq.length; i++) {
                chosenNavs[fq[i]] = ('?q=' + q + '&fq=' + fq.join('&fq=')).replace('&fq=' + fq[i], '');
              }
              $('#solrstrap-facets').append(TEMPLATES.chosenNavTemplate({navs: chosenNavs}));
            }
            //available facets
            for (var k in result.facet_counts.facet_fields) {
              if (result.facet_counts.facet_fields[k].length > 0) {
                $('#solrstrap-facets').append(TEMPLATES.navTemplate({linkroot: window.location.pathname + '?q=' + q 
                  + ((fq.length > 0) ? '&fq=' : '') + fq.join('&fq='),
                  title: k, navs: makeNavsSensible(result.facet_counts.facet_fields[k])}));
              }
            }
          }
        });
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
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null)
      return "";
    else
      return decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  //function to generate an array of URL parameters, where there are likely to be several params with the same key
  function getURLParamArray(name) {
    var paramArray = [];
    var paramString = window.location.search;
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    while (regex.exec(paramString) != null) {
      var results = regex.exec(paramString);
      var paramValue = results[1].replace(/\+/g, " ");
      paramString = paramString.replace("&" + name + "=" + paramValue, "");
      paramArray.push(decodeURIComponent(paramValue));
    }
    return paramArray;
  }

  //utility function that checks to see if an element is onscreen
  function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
  }

  //generates a search URL from the CONSTants
  function getSearchURL(q, offset) {
    var URL = SERVERROOT
    + '?json.wrf=?'
    + '&rows=' + HITSPERPAGE
    + '&wt=json'
    + '&q=' + q
    + '&start=' + offset;
    if (FACETS.length > 0) {
      URL += '&facet=true&facet.mincount=1&facet.limit=20';
      for (var i = 0; i < FACETS.length; i++) {
        URL += '&facet.field=' + FACETS[i];
      }
      for (var i = 0; i < getURLParamArray('fq').length; i++) {
        URL += '&fq=' + getURLParamArray('fq')[i];
      }
    }
    if (HL_FL) {
      URL += '&hl=true&hl.fl='+HL_FL+'&hl.simple.pre='+HL_SIMPLE_PRE+'&hl.simple.post='+HL_SIMPLE_POST
    }
    return URL;
  }

  //optionally convert a string array to a string, by concatenation
  function array_as_string(array_or_string)
  {
    if (typeof(array_or_string) == 'string') 
      return array_or_string;
    else if (typeof(array_or_string) == 'object' 
	     && array_or_string.hasOwnProperty('length') 
	     && array_or_string.length > 0) 
      return array_or_string.join(" ... ");
    else 
      return '';
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
