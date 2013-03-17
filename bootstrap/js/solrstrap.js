

//CONST- CHANGE ALL THESE TO TELL SOLRSTRAP ABOUT THE LOCATION AND STRUCTURE OF YOUR SOLR
var SERVERROOT = 'http://evolvingweb.ca/solr/reuters/select/'; //SELECT endpoint
var HITTITLE = 'title';                                        //Name of the title field- the heading of each hit
var HITBODY = 'text';                                          //Name of the body field- the teaser text of each hit
var HITSPERPAGE = 20;
var FACETS = ['topics','organisations'];


//when the page is loaded- do this
  $(document).ready(function() {
    $('div[offset="0"]').loadSolrResults(getURLParam('q'),
      getURLParamArray('fq'),
      Handlebars.compile($("#hit-template").html()),
      Handlebars.compile($("#result-summary-template").html()),
      Handlebars.compile($("#nav-template").html()),
      Handlebars.compile($("#chosen-nav-template").html()),
      0);
    $('#searchbox').attr('value', getURLParam('q'));
    $('#searchbox').focus();
  });

//when the searchbox is typed- do this
  $('#searchbox').keyup(function() {
    if ($(this).val().length > 3) {
      $('div[offset="0"]').loadSolrResults($(this).val(),
        getURLParamArray('fq'),
        Handlebars.compile($("#hit-template").html()),
        Handlebars.compile($("#result-summary-template").html()),
        Handlebars.compile($("#nav-template").html()),
        Handlebars.compile($("#chosen-nav-template").html()),
        0);
    }
    else {
      $('#rs').css({ opacity: 0.5 });
    }
  });

  //jquery plugin allows resultsets to be painted onto any div.
  (function( $ ){
    $.fn.loadSolrResults = function(q, fq, hitTemplate, summaryTemplate, navTemplate, chosenNavTemplate, offset) {
      $(this).getSolrResults(q, fq, hitTemplate, summaryTemplate, navTemplate, chosenNavTemplate, offset);
    };
  })( jQuery );


  //jquery plugin allows autoloading of next results when scrolling.
  (function( $ ){
    $.fn.loadSolrResultsWhenVisible = function(q, fq, hitTemplate, summaryTemplate, navTemplate, chosenNavTemplate, offset) {
      elem = this;
      $(window).scroll(function(event){
        if (isScrolledIntoView(elem) && !$(elem).attr('loaded')) {
          //dont instantsearch and autoload at the same time
          if ($('#searchbox').val() != getURLParam('q')) {
            window.location = 'solrstrap.html?q=' + $('#searchbox').val();
          }
          $(elem).attr('loaded', true);
          $(elem).getSolrResults(q, fq, hitTemplate, summaryTemplate, navTemplate, chosenNavTemplate, offset);
          $(window).unbind('scroll');
        }
      });
    };
  })( jQuery );


  function getSearchURL(q, offset) {
    var URL = SERVERROOT
    + '?json.wrf=?'
    + '&rows=' + HITSPERPAGE
    + '&wt=json'
    + '&q=' + q
    + '&offset=' + offset;
    if (FACETS.length > 0) {
      URL += '&facet=true&facet.mincount=1&facet.limit=20';
      for (var i = 0; i < FACETS.length; i++) {
        URL += '&facet.field=' + FACETS[i];
      }
      for (var i = 0; i < getURLParamArray('fq').length; i++) {
        URL += '&fq=' + getURLParamArray('fq')[i];
      }
    }
    return URL;
  }


  //jquery plugin for takling to solr
  (function( $ ){
    $.fn.getSolrResults = function(q, fq, hitTemplate, summaryTemplate, navTemplate, chosenNavTemplate, offset) {
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
              rs.append(summaryTemplate({totalresults: result.response.numFound, query: q}));
              rs.siblings().remove();
            }
            //draw the individual hits
            for (var i = 0; i < result.response.docs.length; i++) {
              rs.append(hitTemplate({title: result.response.docs[i][HITTITLE], text: result.response.docs[i][HITBODY]}));
            }
            $(rs).parent().css({ opacity: 1 });
            //if more results to come- set up the autoload div
            if ((+HITSPERPAGE+offset) < +result.response.numFound) {
              var nextDiv = document.createElement('div');
              $(nextDiv).attr('offset', +HITSPERPAGE+offset);
              rs.parent().append(nextDiv);
              $(nextDiv).loadSolrResultsWhenVisible(q, fq, hitTemplate, summaryTemplate, navTemplate, chosenNavTemplate, +HITSPERPAGE+offset);
            }
            //facets
            $('#navs').empty();
            //chosen facets
            if (fq.length > 0) {
              var chosenNavs = {};
              for (var i = 0; i < fq.length; i++) {
                chosenNavs[fq[i]] = ('?q=' + q + '&fq=' + fq.join('&fq=')).replace('&fq=' + fq[i], '');
              }
              $('#navs').append(chosenNavTemplate({navs: chosenNavs}));
            }
            //available facets
            for (var k in result.facet_counts.facet_fields) {
              if (result.facet_counts.facet_fields[k].length > 0) {
                $('#navs').append(navTemplate({linkroot: window.location.pathname + '?q=' + q 
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
