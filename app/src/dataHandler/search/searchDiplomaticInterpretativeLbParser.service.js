/**
 * @ngdoc service
 * @module evtviewer.dataHandler
 * @name evtviewer.dataHandler.search.evtSearchParser
 * @description
 * # evtSearchParser
 * In this service is defined a constructor and his object. The object exposed methods to handle search parser.
 *
 * @requires evtviewer.dataHandler.search.evtSearchDocument
 *
 * @returns {object} Parser object
 *
 * @author GC
 */

angular.module('evtviewer.dataHandler')
   .factory('EvtSearchDiploInterprLbParser', ['evtSearchDocument', 'evtDiplomaticEditionHandler', 'evtInterpretativeEditionHandler', 'evtGlyph', 'Utils', 'XPATH', function (evtSearchDocument, evtDiplomaticEditionHandler, evtInterpretativeEditionHandler, evtGlyph, Utils, XPATH) {
      
      function EvtSearchDiploInterprLbParser(xmlDocBody) {
         this.parsedElementsForIndexing = {};
         this.xmlDocBody = xmlDocBody;
      }
      
      var countAllDocsLine = 0;
      EvtSearchDiploInterprLbParser.prototype.getPrevDocsInfo = function () {
         return countAllDocsLine;
      };
   
      EvtSearchDiploInterprLbParser.prototype.parseElements = function (prevDocsLbNumber) {
         var ns,
            nsResolver,
            xmlDocDom = this.xmlDocBody.ownerDocument;
         
         evtSearchDocument.hasNamespace(xmlDocDom);
         ns = evtSearchDocument.ns;
         nsResolver = evtSearchDocument.nsResolver;
         
         this.parsedElementsForIndexing = getLbLines(this.xmlDocBody.ownerDocument, this.xmlDocBody, prevDocsLbNumber, ns, nsResolver);
         return this.parsedElementsForIndexing;
      };
      
      function getLbLines(xmlDocDom, xmlDocBody, prevDocsLbNumber, ns, nsResolver) {
         var lines = [],
            lbNodes;
         
         evtSearchDocument.removeNoteElements(xmlDocDom);
         lbNodes = getFilteredNodes(xmlDocDom, xmlDocBody, ns, nsResolver);
         lines = getLineInfo(xmlDocDom, xmlDocBody, lbNodes, prevDocsLbNumber, ns, nsResolver);
         
         return lines;
      }
      
      function getFilteredNodes(xmlDocDom, xmlDocBody, ns, nsResolver) {
         return ns ? xmlDocDom.evaluate(XPATH.ns.getLineNodes, xmlDocBody, nsResolver, XPathResult.ANY_TYPE, null)
            : xmlDocDom.evaluate(XPATH.getLineNodes, xmlDocBody, null, XPathResult.ANY_TYPE, null);
      }
      
      function getLineInfo(xmlDocDom, xmlDocBody, lbNodes, prevDocsLbNumber, ns, nsResolver) {
         var currentXmlDoc = evtSearchDocument.getCurrentXmlDoc(xmlDocDom, xmlDocBody, ns, nsResolver),
            diplomaticNodes = evtDiplomaticEditionHandler.getDiplomaticNodes(xmlDocDom, xmlDocBody, ns, nsResolver),
            interpretativeNodes = evtInterpretativeEditionHandler.getInterpretativeNodes(xmlDocDom, xmlDocBody, ns, nsResolver),
            currentPage,
            currentPageId,
            pageId = 1,
            paragraph,
            parId = 1,
            line = {},
            lineId = 1,
            lineNodes = {},
            lines = {},
            countLine = 1,
            node = lbNodes.iterateNext();
         
         while (node !== null) {
            var nodes = {
               'pb': function () {
                  currentPage = evtSearchDocument.getCurrentPage(node);
                  currentPageId = evtSearchDocument.getCurrentPageId(node, pageId);
                  pageId++;
               },
               'p': function () {
                  paragraph = evtSearchDocument.getParagraph(node, parId);
                  parId++;
               },
               'default': function () {
                  if (currentPage !== undefined) {
                     line.page = currentPage;
                     line.pageId = currentPageId;
                  }
                  if (paragraph !== undefined) {
                     line.par = paragraph;
                  }
                  line.xmlDocTitle = currentXmlDoc.title;
                  line.xmlDocId = currentXmlDoc.id;
                  line.line = node.getAttribute('n') || lineId.toString();
                  lineId++;
                  line.docId = line.xmlDocId + '-' + line.pageId + '-' + line.line;
                  
                  lineNodes.diplomatic = getLineNodes(xmlDocDom, diplomaticNodes, prevDocsLbNumber, countLine, ns, nsResolver);
                  lineNodes.interpretative = getLineNodes(xmlDocDom, interpretativeNodes, prevDocsLbNumber, countLine, ns, nsResolver);
                  countLine++;
                  countAllDocsLine++;
                  
                  line.content = {
                     diplomatic: evtSearchDocument.getContent(lineNodes.diplomatic, 'diplomatic'),
                     interpretative: evtSearchDocument.getContent(lineNodes.interpretative, 'interpretative')
                     
                  };
                  lines[line.docId] = line;
                  lineNodes = [];
               }
            };
            (nodes[node.nodeName] || nodes['default'])();
            node = lbNodes.iterateNext();
            line = {};
         }
         
         return lines;
      }
      
      function getLineNodes(xmlDocDom, nodes, prevDocsLbNumber, countLine, ns, nsResolver) {
         var lineNodes = [],
            prevBody,
            prevLb,
            hasPrevLb,
            countPrevLb;
         
         for (var i = 0; i < nodes.length;) {
            prevBody = ns ? xmlDocDom.evaluate(XPATH.ns.getPrevBody, nodes[i], nsResolver, XPathResult.ANY_TYPE, null)
               : xmlDocDom.evaluate(XPATH.getPrevBody, nodes[i], null, XPathResult.ANY_TYPE, null)
            
            prevLb = ns ? xmlDocDom.evaluate(XPATH.ns.getPrevLb, nodes[i], nsResolver, XPathResult.ANY_TYPE, null)
               : xmlDocDom.evaluate(XPATH.getPrevLb, nodes[i], null, XPathResult.ANY_TYPE, null);
            
            //se ci sono più testi allora sottraggo il numero degli <lb> presenti nei testi precedenti al testo corrente,
            // al numero di <lb> precedenti al nodo corrente(nodes[j]) -> sarà sempre maggiore di prevDocsLbNumber.
            // così trovo il numero di <lb> che nel testo corrente precedono il nodo corrente
            //countPrevLb = prevBody.numberValue >= 1 ? prevLb.numberValue - prevDocsLbNumber : prevLb.numberValue;
            
            if (prevBody.numberValue >= 1) {
               countPrevLb = prevLb.numberValue - prevDocsLbNumber;
            }
            else {
               countPrevLb = prevLb.numberValue;
            }
            
            hasPrevLb = countPrevLb !== 0;
            
            if (hasPrevLb === true) {
               if (countLine === countPrevLb) {
                  lineNodes.push(nodes[i]);
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
      
      return EvtSearchDiploInterprLbParser;
   }]);