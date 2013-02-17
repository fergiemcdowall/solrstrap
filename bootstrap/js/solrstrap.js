

//CONST- CHANGE ALL THESE TO TELL SOLRSTRAP ABOUT THE LOCATION AND STRUCTURE OF YOUR SOLR
var SERVERROOT = 'http://evolvingweb.ca/solr/reuters/select/'; //SELECT endpoint
var HITTITLE = 'title';                                        //Name of the title field- the heading of each hit
var HITBODY = 'text';                                          //Name of the body field- the teaser text of each hit




//when the page is loaded- do this
  $(document).ready(function() {
    $('#rs').loadSolrResults(getURLParam('q'), Handlebars.compile($("#hit-template").html()), Handlebars.compile($("#result-summary-template").html()));
    $('#searchbox').attr('value', getURLParam('q'));
    $('#searchbox').focus();
  });

//when the searchbox is typed- do this
  $('#searchbox').keyup(function() {
    if ($(this).val().length > 3) {
      $('#rs').loadSolrResults($(this).val(), Handlebars.compile($("#hit-template").html()), Handlebars.compile($("#result-summary-template").html()));
    }
    else {
      $('#rs').css({ opacity: 0.5 });
    }
  });

  //jquery plugin allows resultsets to be painted onto any div.
  (function( $ ){
    $.fn.loadSolrResults = function(q, hitTemplate, summaryTemplate) {
      var rs = this;
      this.css({ opacity: 0.5 });
      $.getJSON(SERVERROOT + "?q=" + q + "&wt=json&json.wrf=?&rows=20", function(result){
        console.log(result);
        if (result.response.docs.length > 0) {
          rs.empty();
          rs.append(summaryTemplate({totalresults: result.response.numFound, query: q}));
          for (var i = 0; i < result.response.docs.length; i++) {
            rs.append(hitTemplate({title: result.response.docs[i][HITTITLE], text: result.response.docs[i][HITBODY]}));
          }
          rs.css({ opacity: 1 });
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

