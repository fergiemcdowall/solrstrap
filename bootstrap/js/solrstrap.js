

//CONST- CHANGE ALL THESE TO TELL SOLRSTRAP ABOUT THE LOCATION AND STRUCTURE OF YOUR SOLR
var SERVERROOT = 'http://evolvingweb.ca/solr/reuters/select/'; //SELECT endpoint
var HITTITLE = 'title';                                        //Name of the title field- the heading of each hit
var HITBODY = 'text';                                          //Name of the body field- the teaser text of each hit
var HITSPERPAGE = 20;



//when the page is loaded- do this
  $(document).ready(function() {
    $('div[offset="0"]').loadSolrResults(getURLParam('q'), Handlebars.compile($("#hit-template").html()), Handlebars.compile($("#result-summary-template").html()), 0);
    $('#searchbox').attr('value', getURLParam('q'));
    $('#searchbox').focus();
  });

//when the searchbox is typed- do this
  $('#searchbox').keyup(function() {
    if ($(this).val().length > 3) {
      $('#chunk1').loadSolrResults($(this).val(), Handlebars.compile($("#hit-template").html()), Handlebars.compile($("#result-summary-template").html()), 0);
    }
    else {
      $('#rs').css({ opacity: 0.5 });
    }
  });

  //jquery plugin allows resultsets to be painted onto any div.
  (function( $ ){
    $.fn.loadSolrResults = function(q, hitTemplate, summaryTemplate, offset) {
      $(this).getSolrResults(q, hitTemplate, summaryTemplate, offset);
    };
  })( jQuery );


  //jquery plugin allows autoloading of next results.
  (function( $ ){
    $.fn.loadSolrResultsWhenVisible = function(q, hitTemplate, summaryTemplate, offset) {
      elem = this;
      $(window).scroll(function(event){
        if (isScrolledIntoView(elem) && !$(elem).attr('loaded')) {
          $(elem).attr('loaded', true);
          $(elem).getSolrResults(q, hitTemplate, summaryTemplate, offset);
          $(window).unbind('scroll');
        }
      });
    };
  })( jQuery );




  (function( $ ){
    $.fn.getSolrResults = function(q, hitTemplate, summaryTemplate, offset) {
      var rs = this;
      $(rs).parent().css({ opacity: 0.5 });
      $.getJSON(SERVERROOT + "?json.wrf=?",
        {
          'rows': HITSPERPAGE,
          'wt': 'json',
          'q': q,
          'start': offset
        },
        function(result){
          if (result.response.docs.length > 0) {
            if (offset == 0) {
              rs.empty();          
              rs.append(summaryTemplate({totalresults: result.response.numFound, query: q}));
            }
            for (var i = 0; i < result.response.docs.length; i++) {
              rs.append(hitTemplate({title: result.response.docs[i][HITTITLE], text: result.response.docs[i][HITBODY]}));
            }
            $(rs).parent().css({ opacity: 1 });
            var nextDiv = document.createElement('div');
            $(nextDiv).attr('offset', +HITSPERPAGE+offset);
            rs.parent().append(nextDiv);
            $(nextDiv).loadSolrResultsWhenVisible(q, hitTemplate, summaryTemplate, +HITSPERPAGE+offset);
          }
        });
    };
  })( jQuery );



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

  //utility function that checks to see if an element is onscreen
  function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
  }
