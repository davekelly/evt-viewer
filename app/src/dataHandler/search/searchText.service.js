//TODO add documentation
angular.module('evtviewer.dataHandler')
   .service('evtSearchText', ['evtGlyph', 'XPATH', 'evtSearchProse', 'Utils', function Text(evtGlyph, XPATH, evtSearchProse, Utils) {
      
      /**
       * @ngdoc method
       * @module evtviewer.dataHandler
       * @name evtviewer.dataHandler.evtSearchDocument#getText
       * @methodOf evtviewer.dataHandler.evtSearchDocument
       *
       * @description
       * This method get and add line's text to an object
       *
       * @param {array} nodes An array of line's child nodes
       * @param {string} currentEdition The document's current edition (diplomatic, interpretative or critical)
       *
       * @returns {str} return line's text cleaned from double spaces and some punctuation
       *
       * @author GC
       */
      /*function getPoemText(nodes, editionType) {
         var text = '';
         var node = nodes.iterateNext();
         while(node !== null) {
            var currentGlyph;
   
            if (node.nodeName === 'g') {
               currentGlyph = evtGlyph.getGlyph(node);
               text += evtGlyph.addGlyph(currentGlyph, editionType);
            }
            else {
               text += node.textContent;
            }
            node = nodes.iterateNext();
         }
         
         return Utils.cleanText(text);
      }*/
   
      function getText(nodes, editionType) {
         var text = '';
         
         for (var i = 0; i < nodes.length; i++) {
            var currentGlyph;
            
            if (nodes[i].nodeName === 'g') {
               currentGlyph = evtGlyph.getGlyph(nodes[i]);
               text += evtGlyph.addGlyph(currentGlyph, editionType);
            }
            else {
               text += nodes[i].textContent;
            }
         }
      
         return Utils.cleanText(text);
      }
      
      /**
       * @ngdoc method
       * @module evtviewer.dataHandler
       * @name evtviewer.dataHandler.evtSearchDocument#getChildNodes
       * @methodOf evtviewer.dataHandler.evtSearchDocument
       *
       * @description
       * This method get child nodes of specific line node
       *
       * @param {string} currentEdition The document's current edition (diplomatic, interpretative or critical)
       * @param {element} node The line's node
       * @param {boolean} ns True if namespace exist
       * @param {function} nsResolver If exist it resolves the namespace
       *
       * @returns {array} return and array of child nodes
       *
       * @author GC
       */
      /*function getPoemLineChildNodes(xmlDocDom, node, ns, nsResolver) {
         var nodes = [];
         
         nodes.diplomatic = evtSearchPoem.getDiplomaticLineNodes(xmlDocDom, node, nodes, ns, nsResolver);
         nodes.interpretative = evtSearchPoem.getInterpretativeLineNodes(xmlDocDom, node, nodes, ns, nsResolver);
         
         return nodes;
      }*/
      
      //TODO Add Documentation
      function getLineNodes(xmlDocDom, countLine, nodes, edition, ns, nsResolver) {
         var lineNodes = [],
            prevLb,
            hasPrevLb;
   
         for(var j = 0; j < nodes.length;) {
            prevLb = ns ? xmlDocDom.evaluate(XPATH.ns.getPrevLb, nodes[j], nsResolver, XPathResult.ANY_TYPE, null)
               : xmlDocDom.evaluate(XPATH.getPrevLb, nodes[j], null, XPathResult.ANY_TYPE, null);
            hasPrevLb = prevLb.numberValue !== 0;
      
            if (hasPrevLb === true) {
               if (countLine === prevLb.numberValue) {
                  lineNodes.push(nodes[j]);
                  nodes.splice(0, 1);
               }
               else {
            
                  return lineNodes;
               }
            }
            else {
               nodes.splice(0, 1);
            }
         }
         
         return lineNodes;
      }
      
      //TODO Add Documentation
      function getDocTitle(xmlDocDom, docs, node, ns, nsResolver) {
         var docId,
            title,
            textNode = xmlDocDom.getElementsByTagName('group')[0].children,
            
            currentTextNode = ns ? xmlDocDom.evaluate(XPATH.ns.getCurrentTextNode, node, nsResolver, XPathResult.ANY_TYPE, null)
                                 : xmlDocDom.evaluate(XPATH.getCurrentTextNode, node, null, XPathResult.ANY_TYPE, null);
            currentTextNode = currentTextNode.iterateNext();
            
         for (var j = 0; j < textNode.length; j++) {
            if (currentTextNode === textNode[j]) {
               docId = j;
               title = docs[j].title;
            }
         }
         return title;
      }
      
      /**
       * @ngdoc method
       * @module evtviewer.dataHandler
       * @name evtviewer.dataHandler.evtSearchDocument#getDocTitle
       * @methodOf evtviewer.dataHandler.evtSearchDocument
       *
       * @description
       * This method get the doc's title
       *
       * @param {element} xmlDocDom XML element to be parsed
       * @param {array} docs The document's title
       * @param {element} node The current line node
       * @param {boolean} ns True if namespace exist
       * @param {function} nsResolver If exist it resolves the namespace
       *
       * @returns {array} return an array with lines info.
       *
       * @author GC
       */
      function getCurrentDocTitle(xmlDocDom, docs, node, mainTitle, ns, nsResolver) {
         var currentTitle,
            title;
         
         currentTitle = ns ? xmlDocDom.evaluate(XPATH.ns.getCurrentTitle, node, nsResolver, XPathResult.ANY_TYPE, null)
                           : xmlDocDom.evaluate(XPATH.getCurrentTitle, node, null, XPathResult.ANY_TYPE, null);
         currentTitle = currentTitle.stringValue;
         
         if (currentTitle === '' && docs.length > 1) {
            title = getDocTitle(xmlDocDom, docs, node, ns, nsResolver);
         }
         else if (currentTitle === '' && mainTitle !== undefined) {
            title = mainTitle;
         }
         else if (currentTitle === '') {
            title = docs[0].title;
         }
         else {
            for (var i = 0; i < docs.length; i++) {
               if (currentTitle === docs[i].title) {
                  title = docs[i].title;
               }
            }
         }
         return title;
      }
      
      /**
       * @ngdoc method
       * @module evtviewer.dataHandler
       * @name evtviewer.dataHandler.evtSearchDocument#getPoetryTitle
       * @methodOf evtviewer.dataHandler.evtSearchDocument
       *
       * @description
       * This method get the title of a specific poem
       *
       * @param {string} currentEdition The document's current edition (diplomatic, interpretative or critical)
       * @param {element} node The line's node
       * @param {boolean} ns True if namespace exist
       * @param {function} nsResolver If exist it resolves the namespace
       *
       * @returns {str} return the poem's title
       *
       * @author GC
       */
      /*function getCompositionTitle(xmlDocDom, type, line, node, ns, nsResolver) {
         var title = {
               diplomatic: '',
               interpretative: ''
            },
            nodes = getPoemLineChildNodes(xmlDocDom, node, ns, nsResolver);
         
         if(type === 'verse') {
            title.diplomatic = getPoemText(nodes.diplomatic, 'diplomatic');
            title.interpretative = getPoemText(nodes.interpretative, 'interpretative');
         }
         else {
            //TODO cerca esempio di testo
         }
         
         return title;
      }*/
      
      function getDiplomaticNodes(xmlDocDom, diplomaticNodes, ns, nsResolver) {
         var diplomaticNodesSnapshot = ns ? xmlDocDom.evaluate(XPATH.ns.getDiplomaticNodes, xmlDocDom, nsResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null)
            : xmlDocDom.evaluate(XPATH.getDiplomaticNodes, xmlDocDom, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
   
         for(var i = 0; i < diplomaticNodesSnapshot.snapshotLength; i++) {
            diplomaticNodes.push(diplomaticNodesSnapshot.snapshotItem(i));
         }
         return diplomaticNodes;
      }
      
      function getInterpretativeNodes(xmlDocDom, interpretativeNodes, ns, nsResolver) {
         var interpretativeNodesSnapshot = ns ? xmlDocDom.evaluate(XPATH.ns.getInterpretativeNodes, xmlDocDom, nsResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null)
            : xmlDocDom.evaluate(XPATH.getInterpretativeNodes, xmlDocDom, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
   
         for(var i = 0; i < interpretativeNodesSnapshot.snapshotLength; i++) {
            interpretativeNodes.push(interpretativeNodesSnapshot.snapshotItem(i));
         }
         return interpretativeNodes;
      }
      
      /**
       * @ngdoc method
       * @module evtviewer.dataHandler
       * @name evtviewer.dataHandler.evtSearchDocument#getLineInfo
       * @methodOf evtviewer.dataHandler.evtSearchDocument
       *
       * @description
       * This method get line's number, page number, text and some information about line
       *
       * @param {element} xmlDocDom XML element to be parsed
       * @param {array} nodes Line's nodes
       * @param {array} docs The document's title
       * @param {array} lines An empty array
       * @param {string} currentEdition The document's current edition (diplomatic, interpretative or critical)
       * @param {boolean} ns True if namespace exist
       * @param {function} nsResolver If exist it resolves the namespace
       *
       * @returns {array} return an array with lines info.
       *
       * @author GC
       */
      function getLineInfo(xmlDocDom, nodes, docs, ns, nsResolver) {
         console.time('getLineInfo');
         
         var line = {},
            lines = {},
            lineNodes = [],
            currentPage,
            currentPageId,
            currentDoc,
            docTitle,
            mainTitle,
            title,
            diplomaticNodes = [],
            interpretativeNodes = [],
            parId,
            paragraph,
            id = 1,
            countLine = 1;
         
         var node = nodes.iterateNext();
         docTitle = getCurrentDocTitle(xmlDocDom, docs, node, mainTitle, ns, nsResolver);
         
         for(var i in docs) {
            if(docs[i].title === docTitle) {
               currentDoc = docs[i];
            }
         }
         
         diplomaticNodes = getDiplomaticNodes(xmlDocDom, diplomaticNodes, ns, nsResolver);
         interpretativeNodes = getInterpretativeNodes(xmlDocDom, interpretativeNodes, ns, nsResolver);
         
         while (node !== null) {
            if (node.nodeName === 'pb') {
               currentPage = node.getAttribute('n');
               currentPageId = node.getAttribute('xml:id');
            }
            else if (node.nodeName === 'head') {
               /*if (node.getAttribute('type') === 'sub') {
                  title = getCompositionTitle(xmlDocDom, type, line, node, ns, nsResolver);
                  id = 1;
               }
               else {*/
                  mainTitle = node.textContent;
               //}
            }
            else if (node.nodeName === 'p') {
               parId = 1;
               paragraph = node.getAttribute('n') || parId.toString();
               parId++;
            }
            else {
               if (currentPage !== undefined) {
                  line.page = currentPage;
                  line.pageId = currentPageId;
               }
               if (title !== undefined) {
                  line.title = title;
               }
               if (paragraph !== undefined) {
                  line.par = paragraph;
               }
               line.line = node.getAttribute('n') || id.toString();
               id++;
               line.doc = docTitle;
               
               lineNodes.diplomatic = getLineNodes(xmlDocDom, countLine, diplomaticNodes, 'diplomatic', ns, nsResolver);
               lineNodes.interpretative = getLineNodes(xmlDocDom, countLine, interpretativeNodes, 'interpretative', ns, nsResolver);
               countLine++;
               
               line.text = {
                  diplomatic: getText(lineNodes.diplomatic, 'diplomatic'),
                  interpretative: getText(lineNodes.interpretative, 'interpretative')
               };
               
               line.lineId = currentDoc.id + '-' + line.page + '-' + line.line;
               lines[currentDoc.id + '-' + line.page + '-' + line.line] = line;
               
               lineNodes = [];
            }
            node = nodes.iterateNext();
            line = {};
         }
      console.timeEnd('getLineInfo');
      return lines;
   }
   
      function getFilteredBodyNodes(xmlDocDom, body, ns, nsResolver) {
         var bodyFilteredNodes = ns ? xmlDocDom.evaluate(XPATH.ns.getLineNodes, body, nsResolver, XPathResult.ANY_TYPE, null)
            : xmlDocDom.evaluate(XPATH.getLineNodes, body, null, XPathResult.ANY_TYPE, null);
         
         return bodyFilteredNodes;
      }
      
      function getMoreDocumentsLines(xmlDocDom, docs, body, type, ns, nsResolver) {
         var bodyFilteredNodes,
            lineNodesInfo,
            lines = {};
         
         for (var i = 0; i < body.length; i++) {
            bodyFilteredNodes = getFilteredBodyNodes(xmlDocDom, type, body[i], ns, nsResolver);
            lineNodesInfo = getLineInfo(xmlDocDom, type, bodyFilteredNodes, docs, ns, nsResolver);
            lines = Object.assign(lines, lineNodesInfo);
         }
         
         return lines;
      }
      
      function getDocumentLines(xmlDocDom, docs, body, ns, nsResolver) {
         var nodes,
            lines;
         
         nodes = getFilteredBodyNodes(xmlDocDom, body[0], ns, nsResolver);
         lines = getLineInfo(xmlDocDom, nodes, docs, ns, nsResolver);
         
         return lines;
      }
      
      function removeNotes(xmlDocDom) {
         var notes = xmlDocDom.getElementsByTagName('note');
   
         while(notes.length > 0) {
            notes[0].parentNode.removeChild(notes[0]);
         }
      }
      
      /**
       * @ngdoc method
       * @module evtviewer.dataHandler
       * @name evtviewer.dataHandler.evtSearchDocument#getLine
       * @methodOf evtviewer.dataHandler.evtSearchDocument
       *
       * @description
       * This method get line's number, page number, text and some information about lines
       *
       * @param {element} xmlDocDom XML element to be parsed
       * @param {string} currentEdition The document's current edition (diplomatic, interpretative or critical)
       * @param {array} docs The document's title
       * @param {boolean} ns True if namespace exist
       * @param {function} nsResolver If exist it resolves the namespace
       *
       * @returns {array} return an array of parsed lines. The structure is:
       * <pre>
       *     var lines = [
       *       0: {
    *          doc:[],
    *          line:'',
    *          page:'',
    *          poem:'',
    *          text:''
    *       },
       *       1: {
    *          doc:[],
    *          line:'',
    *          page:'',
    *          poem:'',
    *          text:''
    *       }
       *     ]
       * </pre>
       * @author GC
       */
      function getLines(xmlDocDom, docs, ns, nsResolver) {
         var lines = [],
            body;
         
         removeNotes(xmlDocDom);
         body = xmlDocDom.getElementsByTagName('body');
         
         if(body.length > 1) {
            lines = getMoreDocumentsLines(xmlDocDom, docs, body, ns, nsResolver);
         }
         else {
            lines = getDocumentLines(xmlDocDom, docs, body, ns, nsResolver);
         }
         
         return lines;
      }
      
      /**
       * @ngdoc method
       * @module evtviewer.dataHandler
       * @name evtviewer.dataHandler.evtSearchDocument#parseLines
       * @methodOf evtviewer.dataHandler.evtSearchDocument
       *
       * @description
       * This method parses document's lines
       *
       * @param {element} xmlDocDom XML element to be parsed
       * @param {array} lines Parsed lines
       * @param {string} currentEdition The document's current edition (diplomatic, interpretative or critical)
       * @param {array} docs The document's title
       * @param {boolean} ns True if namespace exist
       * @param {function} nsResolver If exist it resolves the namespace
       *
       * @returns {array} return an array of parsed lines
       *
       * @author GC
       */
      Text.prototype.parseLines = function (xmlDocDom, docs, ns, nsResolver) {
         var lines = getLines(xmlDocDom, docs, ns, nsResolver);
         return lines;
      };

/*function getParagraphs(xmlDocDom, currentEdition, docs, ns, nsResolver) {
   
   var lines = [],
	  nodes = ns ? $(xmlDocDom).xpath('//ns:body//(ns:pb|ns:p//ns:lb)', nsResolver)
		 : $(xmlDocDom).xpath('//body//p');
   
   lines = getParInfo(xmlDocDom, nodes, docs, lines, currentEdition, /!*criticalHandler,*!/ ns, nsResolver);
   
   
   return lines;
}*/
/*Text.prototype.parseParagraphs = function() {
   lines = getParagraphs(xmlDocDom, currentEdition, docs, ns, nsResolver);
   return lines;
};*/

}])
;