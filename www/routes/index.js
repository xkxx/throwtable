var async = require('async');
var express = require('express');
var router = express.Router();

var db = require('../private/db');

// Statically gather the language count on server start
var languages;
var algorithmNames; // name and id
db.get_languages(function(err, langs) {
  // Make languages a sorted list by count
  var langArray = [];
  for (var lang in langs) {
    var langObj = {
      language: lang,
      count: langs[lang]
    };
    langArray.push(langObj);
  }
  var languagesCount = langArray.reduce(function(a,b) {
    return a + b.count;
  }, 0);

  for (var i in langArray) {
    var percent = langArray[i].count / languagesCount;
    var r = Math.round(percent * 255 * 99);
    var color ='rgb(' + r + ',45,34)';
    langArray[i].color = color;
  }

  langArray.sort(function(a, b) {
    return b.count - a.count;
  });
  languages = langArray;

});

db.get_algorithms(function(err, algs) {
  algorithmNames = algs.sort(function(a, b) {
    a = a.name.toLowerCase();
    b = b.name.toLowerCase();
    return (a > b) ? 1 : ((b > a) ? -1 : 0);
  });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  var requestStart = +new Date;
  var query = req.query.q;
  var lang = req.query.lang;

  // Send the queries to the db.
  // Remember that all the callbacks return the error object then the result!
  async.parallel({
    count_summary: function(cb) {
      db.count_summary(cb);
    },
    search: function(cb) {
      if (lang && !query) {
        db.search_by_language(lang, cb);
      } else {
        db.search(query, cb);
      }
    }
  }, function(err, data) {
    // After doing all the queries in parallel, render the page!
    data.requestStart = requestStart;
    data.query = query; // may be undefined
    data.lang = lang; // may be undefined
    addExtraData(data);
    res.render('index', data);
  });
});

// Redirect to a random algorithm
router.get('/random', function(req, res, next) {
  db.get_random_algorithm(function(err, id) {
    res.redirect('/' + id);
  });
});

// List of all algorithms
router.get('/algorithms', function(req, res, next) {
  async.parallel({
    count_summary: function(cb) {
      db.count_summary(cb);
    },
  }, function(err, data) {
    data.algorithmNames = algorithmNames;
    addExtraData(data);
    res.render('algorithms', data);
  });
});

/* GET result page */
router.get('/:algorithmId', function(req, res, next) {
  var requestStart = +new Date;
  var algorithmId = req.params.algorithmId;
  async.parallel({
    count_summary: function(cb) {
      db.count_summary(cb);
    },
    search: function(cb) {
      db.search_by_algorithm_id(algorithmId, cb);
    }
  }, function(err, data) {
    data.requestStart = requestStart;
    addExtraData(data);
    data.fullResult = true;
    res.render('result', data);
  });
});

function addExtraData (data) {
  data.languages = languages;
  data.languagesAlphabetical = data.languages.slice().sort(function(a,b) {
    a = a.language.toLowerCase();
    b = b.language.toLowerCase();
    return (a > b) ? 1 : ((b > a) ? -1 : 0);
  });
  var requestEnd = +new Date;
  var requestTime = requestEnd - data.requestStart;
  data.requestTime = requestTime / 1000;
}

module.exports = router;
