{
   "_id": "_design/orcid",
   "_rev": "2-778a784349df71911aba520cb5622b4b",
   "language": "javascript",
   "lists": {
       "n-triples": "function(head,req) { var headers = ''; var row; start({ 'headers': { 'Content-Type': 'text/plain' } }); while(row = getRow()) { send(row.value + '\\n'); } }"
   },
   "views": {
       "nt": {
           "map": "/*\n\nShared code\n\n\n*/\n//----------------------------------------------------------------------------------------\n// Store a triple with optional language code\nfunction triple(subject, predicate, object, language) {\n  var triple = [];\n  triple[0] = subject;\n  triple[1] = predicate;\n  triple[2] = object;\n\n  if (typeof language === 'undefined') {} else {\n    triple[3] = language;\n  }\n\n  return triple;\n}\n\n//----------------------------------------------------------------------------------------\n// Store a quad (not used at present)\nfunction quad(subject, predicate, object, context) {\n  var triple = [];\n  triple[0] = $subject;\n  triple[1] = $predicate;\n  triple[2] = $object;\n  triple[3] = $context;\n\n  return triple;\n}\n\n//----------------------------------------------------------------------------------------\n// Enclose triple in suitable wrapping for HTML display or triplet output\nfunction wrap(s, html) {\n  if (s.match(/^(http|urn|_:)/)) {\n    s = s.replace(/\\\\_/g, '_');\n\n    // handle < > in URIs such as SICI-based DOIs\n    s = s.replace(/</g, '%3C');\n    s = s.replace(/>/g, '%3E');\n\n    if (html) {\n      s = '&lt;' + s + '&gt;';\n    } else {\n      s = '<' + s + '>';\n    }\n  } else {\n    s = s.replace(/</g, '&lt;');\n    s = s.replace(/>/g, '&gt;');\n    s = s.replace(/[\\n|\\r]/g, '');    \n    s = s.replace(/\\\\/g, '');\n\n    s = s.replace(/\"/g, '\\\\\"');\n\n    s = '\"' + s + '\"';\n  }\n  return s;\n}\n\n//----------------------------------------------------------------------------------------\n// https://css-tricks.com/snippets/javascript/htmlentities-for-javascript/\nfunction htmlEntities(str) {\n  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');\n}\n\n//----------------------------------------------------------------------------------------\nfunction output(doc, triples) {\n    // CouchDB\n    for (var i in triples) {\n      var s = 0;\n      var p = 1;\n      var o = 2;\n\n      var lang = 3;\n\n      var nquads = wrap(triples[i][s], false) \n\t    \t+ ' ' + wrap(triples[i][p], false) \n\t    \t+ ' ' + wrap(triples[i][o], false);\n            if (triples[i][lang]) {\n\t    \tnquads += '@' + triples[i][lang];\n\t    }\n            \t    \n\t    \t\n\t    nquads += ' .';\n\n\n      emit(doc._id, nquads);\n      //emit(doc._id, wrap(triples[i][s], false) + ' ' + wrap(triples[i][p], false) + ' ' + wrap(triples[i][o], false) + ' .');\n    }\n}\n\n//----------------------------------------------------------------------------------------\n// https://github.com/Glench/fuzzyset.js\t\t\n(function() {\n\nvar FuzzySet = function(arr, useLevenshtein, gramSizeLower, gramSizeUpper) {\n    var fuzzyset = {\n        version: '0.0.1'\n    };\n\n    // default options\n    arr = arr || [];\n    fuzzyset.gramSizeLower = gramSizeLower || 2;\n    fuzzyset.gramSizeUpper = gramSizeUpper || 3;\n    fuzzyset.useLevenshtein = (typeof useLevenshtein !== 'boolean') ? true : useLevenshtein;\n\n    // define all the object functions and attributes\n    fuzzyset.exactSet = {};\n    fuzzyset.matchDict = {};\n    fuzzyset.items = {};\n\n    // helper functions\n    var levenshtein = function(str1, str2) {\n        var current = [], prev, value;\n\n        for (var i = 0; i <= str2.length; i++)\n            for (var j = 0; j <= str1.length; j++) {\n            if (i && j)\n                if (str1.charAt(j - 1) === str2.charAt(i - 1))\n                value = prev;\n                else\n                value = Math.min(current[j], current[j - 1], prev) + 1;\n            else\n                value = i + j;\n\n            prev = current[j];\n            current[j] = value;\n            }\n\n        return current.pop();\n    };\n\n    // return an edit distance from 0 to 1\n    var _distance = function(str1, str2) {\n        if (str1 === null && str2 === null) throw 'Trying to compare two null values';\n        if (str1 === null || str2 === null) return 0;\n        str1 = String(str1); str2 = String(str2);\n\n        var distance = levenshtein(str1, str2);\n        if (str1.length > str2.length) {\n            return 1 - distance / str1.length;\n        } else {\n            return 1 - distance / str2.length;\n        }\n    };\n    var _nonWordRe = /[^\\w, ]+/;\n\n    var _iterateGrams = function(value, gramSize) {\n        gramSize = gramSize || 2;\n        var simplified = '-' + value.toLowerCase().replace(_nonWordRe, '') + '-',\n            lenDiff = gramSize - simplified.length,\n            results = [];\n        if (lenDiff > 0) {\n            for (var i = 0; i < lenDiff; ++i) {\n                value += '-';\n            }\n        }\n        for (var i = 0; i < simplified.length - gramSize + 1; ++i) {\n            results.push(simplified.slice(i, i + gramSize));\n        }\n        return results;\n    };\n\n    var _gramCounter = function(value, gramSize) {\n        // return an object where key=gram, value=number of occurrences\n        gramSize = gramSize || 2;\n        var result = {},\n            grams = _iterateGrams(value, gramSize),\n            i = 0;\n        for (i; i < grams.length; ++i) {\n            if (grams[i] in result) {\n                result[grams[i]] += 1;\n            } else {\n                result[grams[i]] = 1;\n            }\n        }\n        return result;\n    };\n\n    // the main functions\n    fuzzyset.get = function(value, defaultValue) {\n        // check for value in set, returning defaultValue or null if none found\n        var result = this._get(value);\n        if (!result && typeof defaultValue !== 'undefined') {\n            return defaultValue;\n        }\n        return result;\n    };\n\n    fuzzyset._get = function(value) {\n        var normalizedValue = this._normalizeStr(value),\n            result = this.exactSet[normalizedValue];\n        if (result) {\n            return [[1, result]];\n        }\n\n        var results = [];\n        // start with high gram size and if there are no results, go to lower gram sizes\n        for (var gramSize = this.gramSizeUpper; gramSize >= this.gramSizeLower; --gramSize) {\n            results = this.__get(value, gramSize);\n            if (results) {\n                return results;\n            }\n        }\n        return null;\n    };\n\n    fuzzyset.__get = function(value, gramSize) {\n        var normalizedValue = this._normalizeStr(value),\n            matches = {},\n            gramCounts = _gramCounter(normalizedValue, gramSize),\n            items = this.items[gramSize],\n            sumOfSquareGramCounts = 0,\n            gram,\n            gramCount,\n            i,\n            index,\n            otherGramCount;\n\n        for (gram in gramCounts) {\n            gramCount = gramCounts[gram];\n            sumOfSquareGramCounts += Math.pow(gramCount, 2);\n            if (gram in this.matchDict) {\n                for (i = 0; i < this.matchDict[gram].length; ++i) {\n                    index = this.matchDict[gram][i][0];\n                    otherGramCount = this.matchDict[gram][i][1];\n                    if (index in matches) {\n                        matches[index] += gramCount * otherGramCount;\n                    } else {\n                        matches[index] = gramCount * otherGramCount;\n                    }\n                }\n            }\n        }\n\n        function isEmptyObject(obj) {\n            for(var prop in obj) {\n                if(obj.hasOwnProperty(prop))\n                    return false;\n            }\n            return true;\n        }\n\n        if (isEmptyObject(matches)) {\n            return null;\n        }\n\n        var vectorNormal = Math.sqrt(sumOfSquareGramCounts),\n            results = [],\n            matchScore;\n        // build a results list of [score, str]\n        for (var matchIndex in matches) {\n            matchScore = matches[matchIndex];\n            results.push([matchScore / (vectorNormal * items[matchIndex][0]), items[matchIndex][1]]);\n        }\n        var sortDescending = function(a, b) {\n            if (a[0] < b[0]) {\n                return 1;\n            } else if (a[0] > b[0]) {\n                return -1;\n            } else {\n                return 0;\n            }\n        };\n        results.sort(sortDescending);\n        if (this.useLevenshtein) {\n            var newResults = [],\n                endIndex = Math.min(50, results.length);\n            // truncate somewhat arbitrarily to 50\n            for (var i = 0; i < endIndex; ++i) {\n                newResults.push([_distance(results[i][1], normalizedValue), results[i][1]]);\n            }\n            results = newResults;\n            results.sort(sortDescending);\n        }\n        var newResults = [];\n        for (var i = 0; i < results.length; ++i) {\n            if (results[i][0] == results[0][0]) {\n                newResults.push([results[i][0], this.exactSet[results[i][1]]]);\n            }\n        }\n        return newResults;\n    };\n\n    fuzzyset.add = function(value) {\n        var normalizedValue = this._normalizeStr(value);\n        if (normalizedValue in this.exactSet) {\n            return false;\n        }\n\n        var i = this.gramSizeLower;\n        for (i; i < this.gramSizeUpper + 1; ++i) {\n            this._add(value, i);\n        }\n    };\n\n    fuzzyset._add = function(value, gramSize) {\n        var normalizedValue = this._normalizeStr(value),\n            items = this.items[gramSize] || [],\n            index = items.length;\n\n        items.push(0);\n        var gramCounts = _gramCounter(normalizedValue, gramSize),\n            sumOfSquareGramCounts = 0,\n            gram, gramCount;\n        for (gram in gramCounts) {\n            gramCount = gramCounts[gram];\n            sumOfSquareGramCounts += Math.pow(gramCount, 2);\n            if (gram in this.matchDict) {\n                this.matchDict[gram].push([index, gramCount]);\n            } else {\n                this.matchDict[gram] = [[index, gramCount]];\n            }\n        }\n        var vectorNormal = Math.sqrt(sumOfSquareGramCounts);\n        items[index] = [vectorNormal, normalizedValue];\n        this.items[gramSize] = items;\n        this.exactSet[normalizedValue] = value;\n    };\n\n    fuzzyset._normalizeStr = function(str) {\n        if (Object.prototype.toString.call(str) !== '[object String]') throw 'Must use a string as argument to FuzzySet functions';\n        return str.toLowerCase();\n    };\n\n    // return length of items in set\n    fuzzyset.length = function() {\n        var count = 0,\n            prop;\n        for (prop in this.exactSet) {\n            if (this.exactSet.hasOwnProperty(prop)) {\n                count += 1;\n            }\n        }\n        return count;\n    };\n\n    // return is set is empty\n    fuzzyset.isEmpty = function() {\n        for (var prop in this.exactSet) {\n            if (this.exactSet.hasOwnProperty(prop)) {\n                return false;\n            }\n        }\n        return true;\n    };\n\n    // return list of values loaded into set\n    fuzzyset.values = function() {\n        var values = [],\n            prop;\n        for (prop in this.exactSet) {\n            if (this.exactSet.hasOwnProperty(prop)) {\n                values.push(this.exactSet[prop]);\n            }\n        }\n        return values;\n    };\n\n\n    // initialization\n    var i = fuzzyset.gramSizeLower;\n    for (i; i < fuzzyset.gramSizeUpper + 1; ++i) {\n        fuzzyset.items[i] = [];\n    }\n    // add all the items to the set\n    for (i = 0; i < arr.length; ++i) {\n        fuzzyset.add(arr[i]);\n    }\n\n    return fuzzyset;\n};\n\nvar root = this;\n// Export the fuzzyset object for **CommonJS**, with backwards-compatibility\n// for the old `require()` API. If we're not in CommonJS, add `_` to the\n// global object.\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = FuzzySet;\n    root.FuzzySet = FuzzySet;\n} else {\n    root.FuzzySet = FuzzySet;\n}\n\n})();\t\t\n\n\n//----------------------------------------------------------------------------------------\n// Parse author name\nfunction name_parse(namestring) {\n  var person = {};\n\n  var parts = namestring.match(/^(.*),\\s+(Jr\\.?)$/);\n  if (parts) {\n    namestring = parts[1];\n    person.suffix = parts[2];\n  }\n\n  parts = namestring.match(/(.*),\\s+(.*)/);\n  if (parts) {\n    person.familyName = parts[1];\n    person.givenName = parts[2];\n  }\n\n  // clean up first name, e.g. initials\n  if (person.givenName) {\n    var matched = false;\n    if (!matched) {\n      parts = person.givenName.split(/\\.\\s*/);\n      if (parts.length > 1) {\n        matched = true;\n\t    person.givenName = parts.join(\" \");\n\t    person.givenName = person.givenName.replace(/\\s+$/, '');\n      }\n    }\n    if (!matched) {\n      if (person.givenName.match(/^[A-Z][A-Z]+$/)) {\n        parts = person.givenName.split(\"\");\n        if (parts) {\n          matched = true;\n\t      person.givenName = parts.join(\" \");\n\t    }\n\t  }\n    }\n    \n  }\n\n  if (person.givenName) {\n    person.givenName = person.givenName.replace(/\\s\\-/g, '-');\n  }\n\n  if (person.familyName) {\n    person.name = person.givenName + ' ' + person.familyName;\n  } else {\n    person.name = namestring;\n  }\n\n  // generate standardise string to use as id\n  //person.fingerprint = fingerprint(person.name);\n\n  return person;\n}\n\n//----------------------------------------------------------------------------------------\n// http://stackoverflow.com/a/21445415\nfunction uniques(arr) {\n  var a = [];\n  for (var i = 0, l = arr.length; i < l; i++)\n    if (a.indexOf(arr[i]) === -1 && arr[i] !== '')\n      a.push(arr[i]);\n  return a;\n}\n\nfunction message(doc) {\n if (doc.message) {\n  \n  var triples = [];\n\n  var fuzzy = FuzzySet();\n\n\n  // person\n  var person = {};\n  var bio = doc.message['orcid-profile']['orcid-bio'];\n\n  if (bio['personal-details']['given-names'].value) {\n    person.givenName = bio['personal-details']['given-names'].value;\n       \n  }\n  if (bio['personal-details']['family-name'].value) {\n    person.familyName = bio['personal-details']['family-name'].value;\n  }\n\n  var locale = '';\n  if (doc.message['orcid-profile']['orcid-preferences']) {\n    if (doc.message['orcid-profile']['orcid-preferences'].locale) {\n      locale = doc.message['orcid-profile']['orcid-preferences'].locale;\n    }\n  }\n\n  person.alternateName = [];\n\n  switch (locale) {\n    // Chinese\n    case 'zh_cn':\n    case 'ZH_CN':\n      if (bio['personal-details']['given-names'].value && bio['personal-details']['family-name'].value) {\n        if (bio['personal-details']['given-names'].value.match(/[\\u3400-\\u9FBF]/)) {\n          // conatins Chinese characters, don't attempt to create name\n        } else {\n          // Western style\n          person.alternateName.push(bio['personal-details']['given-names'].value + ' ' + bio['personal-details']['family-name'].value);\n\n          // Reverse\n          person.alternateName.push(bio['personal-details']['family-name'].value + ' ' + bio['personal-details']['given-names'].value);\n        }\n      }\n      break;\n\n    default:\n      if (bio['personal-details']['given-names'].value && bio['personal-details']['family-name'].value) {\n        person.alternateName.push(bio['personal-details']['given-names'].value + ' ' + bio['personal-details']['family-name'].value);\n      }\n      break;\n  }\n\n  // Credit name (this is where we sometimes see full name in Chinese)\n  if (bio['personal-details']['credit-name']) {\n    if (bio['personal-details']['credit-name'].value) {\n      person.alternateName.push(bio['personal-details']['credit-name'].value);\n    }\n  }\n\n  // other names\n  if (bio['personal-details']['other-names']) {\n    for (var j in bio['personal-details']['other-names']['other-name']) {\n      person.alternateName.push(bio['personal-details']['other-names']['other-name'][j].value);\n    }\n  }\n\n  person.identifier = [];\n\n  // other identifiers\n  if (bio['external-identifiers']) {\n    for (var j in bio['external-identifiers']['external-identifier']) {\n      if (bio['external-identifiers']['external-identifier'][j]['external-id-url']) {\n        person.identifier.push(bio['external-identifiers']['external-identifier'][j]['external-id-url'].value);\n      }\n    }\n  }\n\n  // other urls\n  if (bio['researcher-urls']) {\n    for (var j in bio['researcher-urls']['researcher-url']) {\n      person.identifier.push(bio['researcher-urls']['researcher-url'][j]['url'].value);\n\n      // other interpretations\n      result = bio['researcher-urls']['researcher-url'][j]['url'].value.match(/^http:\\/\\/www.ipni.org\\/ipni\\/idAuthorSearch.do\\?id=(.*)$/);\n      if (result) {\n        var lsid = 'urn:lsid:ipni.org:authors:' + result[1];\n\n        person.identifier.push(lsid);\n      }\n\n    }\n  } \n\n  // Ensure we remove duplicate names\n  person.alternateName = uniques(person.alternateName);\n  \n  var subject_id = doc.message['orcid-profile']['orcid-identifier'].uri;\n\n  triples.push(triple(subject_id,\n    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',\n    'http://schema.org/Person'));\n    \n          triples.push(triple(subject_id,\n            'http://schema.org/identifier',\n            subject_id));\n    \n  \n  for (var i in person) {\n    switch (i) {\n      case 'givenName':\n      case 'familyName':\n        triples.push(triple(subject_id,\n          'http://schema.org/' + i,\n          person[i]));\n        break;\n        \n      // other names\n      case 'alternateName':\n        for (var j in person[i]) {\n          triples.push(triple(subject_id,\n            'http://schema.org/alternateName',\n            person[i][j]));\n            \n            fuzzy.add(person[i][j]);\n            \n        }\n        triples.push(triple(subject_id,\n          'http://schema.org/name',\n          person[i][0]));\n        break;\n      \n      // identifiers\n      case 'identifier':\n        for (var j in person[i]) {\n          triples.push(triple(subject_id,\n            'http://schema.org/identifier',\n            person[i][j]));\n        }\n        break;\n        \n      // affiliations (as roles) to do\n    \n      default:\n        break;\n     }\n  }   \n  \n  // works\n  // List each one, and link to author via ORCID. Because ORCID doesn't include author \n  // ORCIDs in list of works we need to do some fussing.\n\n  /*\n  var works = doc.message['orcid-profile']['orcid-activities']['orcid-works']['orcid-work'];\n  for (var i in works) {\n  }\n  */\n \n \n  output(doc, triples);\n  \n  }\n\n}\n\n\n\nfunction(doc) {\n  if (doc['message-format']) {\n    if (doc['message-format'] == 'application/vnd.orcid+json') {\n      message(doc);\n    }\n  }\n}"
       },
       "modified": {
           "map": "function(doc) {\n  if (doc['message-format']) {\n    if (doc['message-format'] == 'application/vnd.orcid+json') {\n     if (doc.message) {\n      emit(doc['message-modified'], doc._id);\n     }\n    }\n  }\n}"
       }
   }
}