/**
 * @ngdoc service
 * @module evtviewer.dataHandler
 * @name evtviewer.dataHandler.evtParser
 * @description 
 * # evtParser
 * Service containing methods to parse data
 *
 * @requires $q
 * @requires xmlParser
 * @requires evtviewer.core.config
 * @requires evtviewer.dataHandler.parsedData
**/
angular.module('evtviewer.dataHandler')

.service('evtParser', function($q, xmlParser, parsedData, config) {
	var parser = {};
	var idx = 0;
	// TODO: create module provider and add default configuration
	// var defAttributes = ['n', 'n', 'n'];
	var defPageElement = 'pb',
		defLineBreak = '<lb>',
		defLine = '<l>',
		possibleNamedEntitiesDef = '<placeName>, <geogName>, <persName>, <orgName>',
		possibleNamedEntitiesListsDef = '<listPlace>, <listPerson>, <listOrg>, <list>';

	var projectInfoDefs = {
		sectionHeaders: '<sourceDesc>, ',
		sectionSubHeaders: '',
		blockLabels: '',
		inlineLabels: '<authority>, <settlement>, <publisher>, <pubPlace>, <availability>, <author>, <editor>, <idno>, <date>, <repository>, <msName>, <textLang>',
		changeDef: '<change>',
		changeWhenDef: '[when]',
		changeByDef: '[who]'
	};
	projectInfoDefs.sectionSubHeaders += '<projectDesc>, <refsDecl>, <notesStmt>, <seriesStmt>, <publicationStmt>, <respStmt>, <funder>, <sponsor>, <msContents>, <revisionDesc>, ';
	projectInfoDefs.sectionSubHeaders += '<principal>, <langUsage>, <particDesc>, <textClass>, <variantEncoding>, <editorialDecl>, <msIdentifier>, <physDesc>, <history>, <extent>, <editionStmt>';
	projectInfoDefs.blockLabels += '<edition>, <correction>, <hyphenation>, <interpretation>, <normalization>, <punctuation>, <interpGrp>';
	projectInfoDefs.blockLabels += '<quotation>, <segmentation>, <stdVals>, <colophon>, <handDesc>, <decoDesc>, <supportDesc>, <origin>';
	// ///////// //
	// UTILITIES //
	// ///////// //
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#isNestedInElem
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will check if an element is nested into another particular element.
     *
     * @param {element} element XML element to be checked  
     * @param {string} parentTagName tagName of the element that does not be a parent of @element
     *
     * @returns {boolean} whether the element is nested in the given other element or not
     * 
     * @author CDP
     */
	parser.isNestedInElem = function(element, parentTagName) {
		if (element.parentNode !== null) {
			if (element.parentNode.tagName === 'text') {
				return false;
			} else if (element.parentNode.tagName === parentTagName) {
				return true;
			} else {
				return parser.isNestedInElem(element.parentNode, parentTagName);
			}
		} else {
			return false;
		}
	};

	parser.capitalize = function(str, all) {
		var reg = (all) ? /([^\W_]+[^\s-]*) */g : /([^\W_]+[^\s-]*)/;
		return (!!str) ? str.replace(reg, function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		}) : '';
	};

	parser.camelToSpace = function(str) {
		return (!!str) ? str.replace(/\W+/g, ' ').replace(/([a-z\d])([A-Z])/g, '$1 $2') : '';
	};

	parser.camelToUnderscore = function(str) {
		return (!!str) ? str.replace(/\W+/g, ' ').replace(/([a-z\d])([A-Z])/g, '$1_$2') : '';
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#isInMainVersion
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will check if an element belongs to the main version of the text.
     *
     * @param {element} element XML element to be checked  
     *
     * @returns {boolean} whether the element belongs to the main version of the text or not
     * 
     * @author CM
     */
	parser.isInMainVersion = function(element) {
		if (element.parentNode !== null) {
			if (element.parentNode.tagName === 'text') {
				return true;
			} else if (element.parentNode.tagName === 'rdgGrp') {
				if (config.versions && config.versions.length > 0) {
					if (element.parentNode.hasAttribute('ana')) {
						if (element.parentNode.getAttribute('ana').replace(/#/, '') === config.versions[0]) {
							return true;
						} else {
							return false;
						}
					} else {
						return false;
					}
				} else {
					return true;
				}
			} else {
				return parser.isInMainVersion(element.parentNode);
			}
		}
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseXMLElement
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will a generic XML element in a quite generic way
     * - It will transform a generic XML element into an <code>span</code> element 
     *  - with a data-* attribute for each @attribute of the XML element
     *  - and a class name that is equal to the tag name of the original XML element
	 * - It will also transform its children
	 * - It will treat in a particular way notes, dates, named entities reference and line breaks.
	 * - When transforming a text node, every <code>__SPACE__</code> string will be converted back to single spaces.
	 * (They were transformed in <code>__SPACE__</code> because when parsing XML single spaces between two elements are deleted).
	 *
     * @param {element} doc XML element of global document to be parsed
     * @param {element} element XML element to be parsed
     * @param {Object} options object indicating some specifig options, 
     * e.g. skip (which elements to skip from being transformed), 
     * exclude (which elements to exclude from final result),
     * context (in which context the parser was called). 
     * This parameter is ready to be used for further options needed when expanding the generic parser.
     *
     * @returns {element} XHTML element with the same data as the XML element read.
     * 
     * @author CDP
     */
	parser.parseXMLElement = function(doc, element, options) {
		var newElement;
		var skip = options.skip || '',
			exclude = options.exclude || undefined;

		if (element.nodeType === 3) { // Text
			newElement = element;
            if (newElement.textContent) {
                newElement.textContent = newElement.textContent.replace('__SPACE__', ' ');
            }
			// newElement = document.createElement('span');
			// newElement.className = "textNode";
			// newElement.appendChild(element);
		} else if (element.tagName !== undefined && skip.toLowerCase().indexOf('<' + element.tagName.toLowerCase() + '>') >= 0) {
			newElement = element;
		} else if (element.tagName !== undefined && exclude !== undefined && exclude.toLowerCase().indexOf('<' + element.tagName.toLowerCase() + '>') >= 0) {
			newElement = document.createTextNode('');
		} else {
			var tagName = element.tagName !== undefined ? element.tagName.toLowerCase() : '';
			if (element.attributes !== undefined &&
				element.attributes.copyOf !== undefined &&
				element.attributes.copyOf.value !== '') {
				newElement = document.createElement('span');
				newElement.className = element.tagName + ' copy';
				var copyOfId = element.attributes.copyOf.value.replace('#', '');
				var match = '<' + element.tagName + ' xml:id="' + copyOfId + '.*<\/' + element.tagName + '>';
				var sRegExInput = new RegExp(match, 'ig');
				var copiedElementText = doc.outerHTML.match(sRegExInput);

				if (copiedElementText) {
					var copiedElement = angular.element(copiedElementText[0])[0];
					newElement.appendChild(parser.parseXMLElement(doc, copiedElement, options));
				}
			} else {
				if (!parsedData.getEncodingDetail('usesLineBreaks') && tagName === 'l') {
					newElement = parser.parseLine(element);
				} else if (tagName === 'note' && skip.indexOf('<evtNote>') < 0) {
					newElement = parser.parseNote(element);
				} else if (tagName === 'date' && (!element.childNodes || element.childNodes.length <= 0)) { //TEMP => TODO: create new directive
					newElement = document.createElement('span');
					newElement.className = element.tagName;
					var textContent = '';
					for (var i = 0; i < element.attributes.length; i++) {
						var attrib = element.attributes[i];
						if (attrib.specified) {
							if (attrib.name !== 'xml:id') {
								var date = new Date(attrib.value);
								var formattedDate = date && !isNaN(date) ? date.toLocaleDateString() : attrib.value;
								textContent += parser.camelToSpace(attrib.name.replace(':', '-')).toLowerCase() + ': ' + formattedDate + ', ';
							}
						}
					}
					newElement.textContent = textContent.slice(0, -1);

				} else if (config.namedEntitiesSelector &&
					possibleNamedEntitiesDef.toLowerCase().indexOf('<' + tagName + '>') >= 0 &&
					element.getAttribute('ref') !== undefined) { //TODO: Rivedere
					newElement = parser.parseNamedEntity(doc, element, skip);
				} else {
					newElement = document.createElement('span');
					newElement.className = element.tagName !== undefined ? element.tagName : '';



					if (element.attributes) {
						for (var k = 0; k < element.attributes.length; k++) {
							var attribK = element.attributes[k];
							if (attribK.specified) {
								if (attribK.name !== 'xml:id') {
									newElement.setAttribute('data-' + attribK.name.replace(':', '-'), attribK.value);
								}
							}
						}
					}
					if (element.childNodes) {
						for (var j = 0; j < element.childNodes.length; j++) {
							var childElement = element.childNodes[j].cloneNode(true);
							newElement.appendChild(parser.parseXMLElement(doc, childElement, options));
						}
					} else {
						newElement.innerHTML = element.innerHTML + ' ';
					}

					if (options.context && options.context === 'projectInfo') {
						if (newElement.innerHTML.replace(/\s/g, '') !== '') {
							var labelElement = document.createElement('span'),
								addLabel = false;
							labelElement.className = 'label-' + element.tagName;
							labelElement.innerHTML = '{{ \'PROJECT_INFO.' + parser.camelToUnderscore(element.tagName).toUpperCase() + '\' | translate }}';
							if (projectInfoDefs.sectionHeaders.toLowerCase().indexOf('<' + tagName + '>') >= 0) {
								labelElement.className += ' projectInfo-sectionHeader';
								addLabel = true;
							} else if (projectInfoDefs.sectionSubHeaders.toLowerCase().indexOf('<' + tagName + '>') >= 0) {
								labelElement.className += ' projectInfo-sectionSubHeader';
								addLabel = true;
							} else if (projectInfoDefs.blockLabels.toLowerCase().indexOf('<' + tagName + '>') >= 0) {
								labelElement.className += ' projectInfo-blockLabel';
								addLabel = true;
							} else if (projectInfoDefs.inlineLabels.toLowerCase().indexOf('<' + tagName + '>') >= 0) {
								labelElement.className += ' projectInfo-inlineLabel';
								labelElement.innerHTML += ': ';
								addLabel = true;
							}
							if (projectInfoDefs.changeDef.toLowerCase().indexOf('<' + tagName + '>') >= 0) {
								var changeText = '';
								var changeWhen = element.getAttribute(projectInfoDefs.changeWhenDef.replace(/[\[\]]/g, ''));
								if (changeWhen) {
									changeText += changeWhen + ' ';
								}
								var changeBy = element.getAttribute(projectInfoDefs.changeByDef.replace(/[\[\]]/g, ''));
								if (changeBy) {
									changeText += '[' + changeBy + ']';
								}
								if (changeText !== '') {
									newElement.innerHTML = changeText + ' - ' + newElement.innerHTML;
								}
							}
							if (addLabel) {
								newElement.insertBefore(labelElement, newElement.childNodes[0]);
							}
						}
					}

					if (tagName === 'lb') {
						newElement.id = element.getAttribute('xml:id');
						newElement.appendChild(document.createElement('br'));
						var lineN = document.createElement('span');
						lineN.className = 'lineN';
                        var lineNum = element.getAttribute('n');
                        lineN.textContent = lineNum; 
                        if (lineNum) {
                            newElement.appendChild(lineN);  
                        }
					}
				}
			}
		}
        if (element.nodeType === 3 || (newElement.innerHTML && newElement.innerHTML.replace(/\s/g, '') !== '')) {
			return newElement;
		} else {
			return document.createTextNode('');
		}
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseElementAttributes
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse all the attributes (and their values) of a given element into a structured JSON object
     *
     * @param {element} element XML element to be parsed
     *
     * @returns {Object} JSON object representing the attributes parsed, structured as follows:
     	<pre>
			var attributes = {
				attriName1: 'attrib value 1',
				attriName2: 'attrib value 2',
				_indexes: ['attribName1', 'attribName2']
			}
     	</pre>
     * 
     * @author CDP
     */
	parser.parseElementAttributes = function(element) {
		var attributes = {
			_indexes: []
		};
		if (element && element.attributes) {
			for (var i = 0; i < element.attributes.length; i++) {
				var attrib = element.attributes[i];
				if (attrib.specified) {
					var attribName = attrib.name.replace(':', '-');
					attributes[attribName] = attrib.value;
					attributes._indexes.push(attribName);
				}
			}
		}
		return attributes;
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseElementAttributes
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse external files and add them to {@link evtviewer.dataHandler.parsedData parsedData}.
     *
     * @param {element} doc XML element to be parsed
     * @param {string} type type of external resources being parsed
     *
     * @author CM
     */
	parser.parseExternalDocuments = function(doc, type) {
		var newExtDoc = {
			value: type,
			content: doc
		};
		if (type !== 'analogues' && type !== 'sources') {
			parsedData.addSourceDocument(newExtDoc, type);
		} else {
			parsedData.addExternalDocument(newExtDoc, type);
		}
		console.log('## Source Documents ##', parsedData.getSourceDocuments());
		console.log('## External Documents ##', parsedData.getExternalDocuments());
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#createRegExpr
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will take a string, used in the config file to define a critical elements,
     * and returns a string that will be used to search the XML elements.
     * - It checks if there is an attribute, introduced by a '['
     *  - If there isn't a square bracket, it adds the element name in the match string
     * - Otherwise it saves the name of the element marked by the '<' and the '['
     * - Adds regular expression operators to the match string
     * - Looks for the closing square bracket and for the equals sign
     * - Adds the name of the attribute , the regular expression operators and and the value of the attribute
     *
     * @param {string} def string of the element definition, contained in config file. 
     * It may contain more than one definition separated by commas
     *
     * @returns {RegExp} the regular expression created
     *
     * @author CM
     */
	parser.createRegExpr = function(def) {
		var match = '(',
			//Save all the definition contained in def in aDef array
			aDef = def.split(',');

		for (var i = 0; i < aDef.length; i++) {
			//Checks if there is an attribute, introduced by a '['
			if (aDef[i].indexOf('[') < 0) {
				//If there isn't a square bracket, it adds the element name in the match string
				match += aDef[i].replace(/[>]/g, '');
			} else {
				//Otherwise it saves the name of the element marked by the '<' and the '['
				var bracketOpen = aDef[i].indexOf('[');
				if (aDef[i].substring(1, bracketOpen) !== '[') {
					match += aDef[i].substring(0, bracketOpen);
				}
				//Adds regular expression operators to the match string
				match += '[^<>]*?';
				//Looks for the closing square bracket
				var bracketClose = aDef[i].indexOf(']');
				//...and for the equals sign
				var equal = aDef[i].indexOf('=');
				//Adds the name of the attribute...
				match += aDef[i].substring(bracketOpen + 1, equal);
				//...reg expr operators
				match += '\\s*?=\\s*?[\'\"]\\s*?';
				//...and the value of the attribute
				match += aDef[i].substring(equal + 1, bracketClose);
			}
			if (i < aDef.length - 1) {
				//Adds operator or to add a new definition contained in aDef
				match += '|';
			} else if (i === aDef.length - 1) {
				//Closes the regular expression
				match += ')';
			}
		}

		var sRegExpInput = new RegExp(match, 'i');

		return sRegExpInput;
	};

	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#createAbbreviation
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will take a string and transforms it into an abbreviated <code>textNode</code> contained in a <code>span</code> element.
     *
     * @param {string} string string to abbreviate 
     * @param {number} maxLength maximum length of the string to show
     *
     * @returns {string} the abbreviated string
     *
     * @author CM
     */
	parser.createAbbreviation = function(string, maxLength) {
		var length = maxLength / 2,
			stringBegin = string.substring(0, length),
			stringEnd = string.substring((string.length - length - 1), (string.length - 1)),
			wslastIndexBegin = stringBegin.lastIndexOf('', (stringBegin.length - 1)),
			wsfirstIndexEnd = stringEnd.indexOf('', 1),
			begin = stringBegin.substring(0, wslastIndexBegin),
			blurredBegin = stringBegin.substring(wslastIndexBegin, stringBegin.length),
			end = stringEnd.substring(wsfirstIndexEnd, stringEnd.length),
			blurredEnd = stringEnd.substring(0, wsfirstIndexEnd);
		var result = '<span class="textNode">' + begin + '<span class="blurredText">' + blurredBegin + '</span> [...] <span class="blurredText">' + blurredEnd + '</span>' + end + '</span>';
		return result;
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#balanceXHTML
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will an excerpted or truncated XHTML string and returns a well-balanced XHTML string
     * - It checks for broken tags, e.g. <code>&lt;stro</code> [a <code>&lt;</code> after the last <code>&gt;</code> indicates a broken tag]
	 *  - It eventually truncates broken tags
	 * - It checks for broken elements, e.g. <code>&lt;strong&gt;Hello, w</code>
	 *  - It gets an array of all tags (start, end, and self-closing)
	 *  - It prepares an empty array where to store broken tags (<code>stack</code>)
	 *  - It loops over all tags
	 *    - when it founds an end tag, it pops it off of the stack
	 *    - when it founds a start tag, it push it onto the stack
	 *    - then it founds a self-closing tag, it do nothing
	 *  - At the end of the loop, <code>stack</code> should contain only the start tags of the broken elements, most deeply-nested at the top
	 *  - It loops over stack array 
	 *    - pops the unmatched tag off the stack
	 *    - gets just the tag name
	 *    - and appends the end tag
	 *
     * @param {string} XHTMLstring string to balanced 
     *
     * @returns {string} well-balanced XHTML string
     *
     * @author CDP
     */
	parser.balanceXHTML = function(XHTMLstring) {
		// Check for broken tags, e.g. <stro
		// Check for a < after the last >, indicating a broken tag
		if (XHTMLstring) {
			if (XHTMLstring.lastIndexOf('<') > XHTMLstring.lastIndexOf('>')) {
				// Truncate broken tag
				XHTMLstring = XHTMLstring.substring(0, XHTMLstring.lastIndexOf('<'));
			}

			// Check for broken elements, e.g. <strong>Hello, w
			// Get an array of all tags (start, end, and self-closing)
			var tags = XHTMLstring.match(/<(?!\!)[^>]+>/g);
			var stack = [];
			var tagToOpen = [];
			for (var tag in tags) {
				if (tags[tag].search('/') === 1) { // </tagName>
					// end tag -- pop off of the stack
					// se l'ultimo elemento di stack è il corrispettivo tag di apertura
					var tagName = tags[tag].replace(/[<\/>]/ig, '');
					var openTag = stack[stack.length - 1];
					if (openTag && (openTag.search('<' + tagName + ' ') >= 0 || openTag.search('<' + tagName + '>') >= 0)) {
						stack.pop();
					} else { //Tag non aperto
						tagToOpen.push(tagName);
					}
				} else if (tags[tag].search('/>') <= 0) { // <tagName>
					// start tag -- push onto the stack
					stack.push(tags[tag]);
				} else { // <tagName />
					// self-closing tag -- do nothing
				}
			}

			// stack should now contain only the start tags of the broken elements, most deeply-nested at the top
			while (stack.length > 0) {
				// pop the unmatched tag off the stack
				var endTag = stack.pop();
				// get just the tag name
				endTag = endTag.substring(1, endTag.search(/[ >]/));
				// append the end tag
				XHTMLstring += '</' + endTag + '>';
			}

			while (tagToOpen.length > 0) {
				var startTag = tagToOpen.shift();
				XHTMLstring = '<' + startTag + '>' + XHTMLstring;
			}
		}

		// Return the well-balanced XHTML string
		return (XHTMLstring ? XHTMLstring : '');
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#analyzeEncoding
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will analyze the encoding and save the encoding details in 
     * {@link evtviewer.dataHandler.parsedData parsedData}.
     * Details handled are:
     * - whether the edition uses line breaks of not
     * - whether the edition has line numbers encoded or not
	 *
     * @param {string} XHTMLstring string to balanced 
     *
     * @author CDP
     */
	parser.analyzeEncoding = function(doc) {
		// Check if uses line breaks to divide lines
		var currentDocument = angular.element(doc);
		var lineBreaks = currentDocument.find(defLineBreak.replace(/[<>]/g, ''));
		parsedData.setEncodingDetail('usesLineBreaks', lineBreaks.length > 0);

		var lineNums = currentDocument.find(defLine.replace(/[<>]/g, '') + '[n]');
		parsedData.setEncodingDetail('lineNums', lineNums.length > 0);
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseNote
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse an XML element representing a note (<code>note</code> in XMLT-TEI P5)
     * and transform it into an <code>evt-popover</code> element.
	 *
     * @param {element} noteNode element to be parsed
     *
     * @returns {element} <code>evt-popover</code> generated
     *
     * @author CDP
     */
	parser.parseNote = function(noteNode) {
		var popoverElem = document.createElement('evt-popover');

		popoverElem.setAttribute('data-trigger', 'click');
		popoverElem.setAttribute('data-tooltip', noteNode.innerHTML);
		popoverElem.innerHTML = '<i class="icon-evt_note"></i>';
		return popoverElem;
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseNamedEntity
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse an XML element representing a named entity
     * and transform it into an <code>evt-named-entity-ref</code> element.
	 *
     * @param {element} doc XML element to be parsed
     * @param {element} entityNode node to be transformed
     * @param {string} skip names of sub elements to skip from transformation
     * 
     * @returns {element} <code>evt-named-entity-ref</code> generated
     *
     * @author CDP
     */
	parser.parseNamedEntity = function(doc, entityNode, skip) {
		var entityElem = document.createElement('evt-named-entity-ref'),
			entityRef = entityNode.getAttribute('ref'),
			entityId = entityRef ? entityRef.replace('#', '') : undefined;
		if (entityId && entityId !== '') {
			entityElem.setAttribute('data-entity-id', entityId);
		}
		var listType = entityNode.tagName ? entityNode.tagName : 'generic';
		entityElem.setAttribute('data-entity-type', listType);

		var entityContent = '';
		for (var i = 0; i < entityNode.childNodes.length; i++) {
			var childElement = entityNode.childNodes[i].cloneNode(true),
				parsedXmlElem;

			parsedXmlElem = parser.parseXMLElement(doc, childElement, {
				skip: skip
			});
			entityElem.appendChild(parsedXmlElem);
		}
		return entityElem;
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseLines
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse all line elements inside an XML document.
	 *
     * @param {element} docDOM XML document to be parsed
     *
     * @author CDP
     */
	parser.parseLines = function(docDOM) {
		var lines = docDOM.getElementsByTagName('l');
		var n = 0;
		while (n < lines.length) {
			var lineNode = lines[n],
				newElement = parser.parseLine(lineNode);
			lineNode.parentNode.replaceChild(newElement, lineNode);
		}
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseLine
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse an XML element representing a line
     * and transform it in a <code>div</code> element with specific data-* attributes 
     * indicating some specific properties of the line and line number.
	 *
     * @param {element} lineNode XML element to be parsed
     *
     * @returns {element} <code>div</code> representing the parsed line
     *
     * @author CDP
     */
	parser.parseLine = function(lineNode) {
		var newElement = document.createElement('div');
		newElement.className = lineNode.tagName + ' l-block';
		for (var i = 0; i < lineNode.attributes.length; i++) {
			var attrib = lineNode.attributes[i];
			if (attrib.specified) {
				newElement.setAttribute('data-' + attrib.name.replace(':', '-'), attrib.value);
			}
		}
		newElement.innerHTML = lineNode.innerHTML;
		var lineNum = lineNode.getAttribute('n');
		if (lineNum && lineNum !== '') {
			var lineNumElem = document.createElement('span');
			lineNumElem.className = 'lineN';
			lineNumElem.textContent = lineNum;
			newElement.className += ' l-hasLineN';
			newElement.innerHTML = lineNumElem.outerHTML + '<span class="lineContent">' + newElement.innerHTML + '</span>';
			//newElement.insertBefore(lineNumElem, newElement.childNodes[0]);
		} else if (parsedData.getEncodingDetail('lineNums')) {
			newElement.className += ' l-indent';
		}

		return newElement;
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseGlyphs
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse an XML element representing a glyph and its mappings
     * and save it in {@link evtviewer.dataHandler.parsedData parsedData} for future retrievements.
	 *
     * @param {string} doc string representing the XML document to be parsed
     *
     * @author CDP
     */
	parser.parseGlyphs = function(doc) {
		var currentDocument = angular.element(doc);
		angular.forEach(currentDocument.find('glyph, char'),
			function(element) {
				var glyph = {};
				glyph.id = element.getAttribute('xml:id') || '';
				glyph.xmlCode = element.outerHTML;
				glyph.mapping = {};
				angular.forEach(angular.element(element).find('mapping'),
					function(mapping) {
						var sType = mapping.getAttribute('type');
						glyph.mapping[sType] = {
							element: mapping.outerHTML,
							content: mapping.innerHTML,
							attributes: []
						};
						for (var i = 0; i < mapping.attributes.length; i++) {
							var attrib = mapping.attributes[i];
							if (attrib.specified) {
								glyph.mapping[sType].attributes.push({
									name: attrib.name.replace(':', '-'),
									value: attrib.value
								});
							}
						}
					});
				var parsedXmlElem = parser.parseXMLElement(doc, element, {
					skip: ''
				});
				glyph.parsedXml = parsedXmlElem ? parsedXmlElem.outerHTML : '';
				//TODO: decide how to structure content
				parsedData.addGlyph(glyph);
			});
		console.log('# GLYPHS #', parsedData.getGlyphs());
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#xpath
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will generate a string representing the xpath of the given element.
     * This string can be use as a unique identifier, since every element as a different xpath.
	 *
     * @param {element} el XML element to analyze
     *
     * @returns {string} calculated xpath of the given element
     *
     * @author CDP
     */
	parser.xpath = function(el) {
		try {
			if (typeof el === 'string') {
				// document.evaluate(xpathExpression, contextNode, namespaceResolver, resultType, result );
				return document.evaluate(el, document, null, 0, null);
			}
			if (!el || el.nodeType !== 1) {
				return '';
			}
			var sames = [];
			if (el.parentNode) {
				sames = [].filter.call(el.parentNode.children, function(x) {
					return x.tagName === el.tagName;
				});
			}
			var countIndex = sames.length > 1 ? ([].indexOf.call(sames, el) + 1) : '';
			countIndex = countIndex > 1 ? countIndex - 1 : '';
			var tagName = el.tagName.toLowerCase() !== 'tei' ? '-' + el.tagName.toLowerCase() : '';
			return parser.xpath(el.parentNode) + tagName + countIndex;
		} catch (e) {
			idx++;
			return '-id' + idx;
		}
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parsePages
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse the pages of a given edition document in a given XML document
     * and store them in {@link evtviewer.dataHandler.parsedData parsedData} for future retrievements.
	 *
     * @param {string} doc string representing the XML element to parse
     * @param {string} docId id of the document to analyze and to whom add parsed pages
     *
     * @author CDP
     */
	parser.parsePages = function(doc, docId) {
		var currentDocument = angular.element(doc);
		angular.forEach(currentDocument.find(defPageElement),
			function(element) {
				var newPage = {};
				if (element.getAttribute('ed')) {
					newPage.value = element.getAttribute('xml:id') || element.getAttribute('ed').replace('#', '') + '-' + element.getAttribute('n') || 'page_' + (parsedData.getPages().length + 1);
				} else {
					newPage.value = element.getAttribute('xml:id') || 'page_' + (parsedData.getPages().length + 1);
				}
				newPage.label = element.getAttribute('n') || 'Page ' + (parsedData.getPages().length + 1);
				newPage.title = element.getAttribute('n') || 'Page ' + (parsedData.getPages().length + 1);
				for (var i = 0; i < element.attributes.length; i++) {
					var attrib = element.attributes[i];
					if (attrib.specified) {
						newPage[attrib.name.replace(':', '-')] = attrib.value;
					}
				}

				// Get image source URL
				if (element.getAttribute('facs')) {
					newPage.source = element.getAttribute('facs');
				} else {
					// TODO: handle other cases (e.g. <surface>)
					newPage.source = '';
				}
				parsedData.addPage(newPage, docId);
			});
		//console.log('## Pages ##', parsedData.getPages());
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseDocuments
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse the documents of a given XML document
     * and store them in {@link evtviewer.dataHandler.parsedData parsedData} for future retrievements.
	 *
     * @param {string} doc string representing the XML element to parse
     *
     * @author CDP
     */
	parser.parseDocuments = function(doc) {
		var currentDocument = angular.element(doc),
			defDocElement,
			defContentEdition = 'body';
		if (currentDocument.find('text group text').length > 0) {
			defDocElement = 'text group text';
		} else if (currentDocument.find('text').length > 0) {
			defDocElement = 'text';
		} else if (currentDocument.find('div[subtype="edition_text"]').length > 0) {
			defDocElement = 'div[subtype="edition_text"]';
			defContentEdition = 'div';
		}

		var frontDef = '<front>',
			biblDef = '<biblStruct>';

		parsedData.setCriticalEditionAvailability(currentDocument.find(config.listDef.replace(/[<>]/g, '')).length > 0);

		angular.forEach(currentDocument.find(defDocElement),
			function(element) {
				var newDoc = {
					value: element.getAttribute('xml:id') || parser.xpath(doc).substr(1) || 'doc_' + (parsedData.getDocuments()._indexes.length + 1),
					label: element.getAttribute('n') || 'Doc ' + (parsedData.getDocuments()._indexes.length + 1),
					title: element.getAttribute('n') || 'Document ' + (parsedData.getDocuments()._indexes.length + 1),
					content: element,
					front: undefined,
					pages: [] // Pages will be added later
				};
				var docFront = element.querySelectorAll(frontDef.replace(/[<\/>]/ig, ''));
				if (docFront && docFront[0]) {
					var frontElem = docFront[0].cloneNode(true),
						biblRefs = frontElem.querySelectorAll(biblDef.replace(/[<\/>]/ig, ''));
					if (biblRefs) {
						for (var i = biblRefs.length - 1; i >= 0; i--) {
							var evtBiblElem = document.createElement('evt-bibl-elem'),
								biblElem = biblRefs[i],
								biblId = biblElem.getAttribute('xml:id') || parser.xpath(biblElem).substr(1);

							evtBiblElem.setAttribute('data-bibl-id', biblId);
							biblElem.parentNode.replaceChild(evtBiblElem, biblElem);
						}
					}
					var parsedContent = parser.parseXMLElement(element, frontElem, {
							skip: biblDef + '<evt-bibl-elem>'
						}),
						frontAttributes = parser.parseElementAttributes(frontElem);
					newDoc.front = {
						attributes: frontAttributes,
						parsedContent: parsedContent && parsedContent.outerHTML ? parsedContent.outerHTML.trim() : '',
						originalContent: frontElem.outerHTML
					};
				}

				for (var j = 0; j < element.attributes.length; j++) {
					var attrib = element.attributes[j];
					if (attrib.specified) {
						newDoc[attrib.name.replace(':', '-')] = attrib.value;
					}
				}
				parsedData.addDocument(newDoc);
				parser.parsePages(element, newDoc.value);
				if (config.defaultEdition !== 'critical' || !parsedData.isCriticalEditionAvailable()) {
					// Split pages works only on diplomatic/interpretative edition
					// In critical edition, text will be splitted into pages for each witness
					config.defaultEdition = 'diplomatic';
					angular.forEach(angular.element(element).find(defContentEdition),
						function(editionElement) {
							//editionElement.innerHTML = parser.splitLineBreaks(element, defContentEdition);
							parser.splitPages(editionElement, newDoc.value, defContentEdition);
						});
				}
			});
		console.log('## PAGES ##', parsedData.getPages());
		console.log('## Documents ##', parsedData.getDocuments());
		return parsedData.getDocuments();
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#splitLineBreaks
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse a given XML document and split it into lines.
     * It will uses regular expression to divide the XML into pieces 
     * and then balance the generated XHTML in order to handle the last line break.
	 *
     * @param {element} docElement XML element to parse
     * @param {string} defContentEdition string representing the definition of the starting point of the edition

     * @returns {string} string representing the HTML with content divided into lines
     *
     * @author CDP
     */
	parser.splitLineBreaks = function(docElement, defContentEdition) {
		var splittedHTML = '';
		// First Line Breaks (intended as text before first <lb>)
		var contentEditionMatch = '<' + defContentEdition + '(.|[\r\n])*?>',
			firstLineMatch = contentEditionMatch + '(.|[\r\n])*?<lb(.|[\r\n])*?\/>',
			sRegExFirstLine = new RegExp(firstLineMatch, 'ig'),
			matchesFirstLine = docElement.outerHTML.match(sRegExFirstLine);
		if (matchesFirstLine && matchesFirstLine.length > 0) {
			var sRegExContentEdition = new RegExp(contentEditionMatch, 'ig'),
				firstLineHTML = matchesFirstLine[0].replace(sRegExContentEdition, '');
			firstLineHTML = parser.balanceXHTML(firstLineHTML);
			splittedHTML += '<evtLB>' + firstLineHTML + '</evtLB>';
		}
		// var sRegExLbElem = new RegExp(/<lb(.|[\r\n])*?\/>/, 'ig');
		// var lbHTMLString = matches[i].match(sRegExLbElem);

		// Other Line Breaks 
		var lineMatch = '<lb(.|[\r\n])*?(?=(<lb|<\/' + defContentEdition + '>))',
			sRegExLine = new RegExp(lineMatch, 'ig'),
			matches = docElement.outerHTML.match(sRegExLine),
			totMatches = matches ? matches.length : 0;
		for (var i = 0; i < totMatches; i++) {
			var lineHTML = parser.balanceXHTML(matches[i]);
			splittedHTML += '<evtLB>' + lineHTML + '</evtLB>';
		}
		return splittedHTML;
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#splitPages
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse a given XML document and split it into pages.
     * It will uses regular expression to divide the XML into pieces 
     * and then balance the generated XHTML in order to handle the last page break.
     * Finally it stores the result into {@link evtviewer.dataHandler.parsedData parsedData} for future retrievements.
	 *
     * @param {element} docElement XML element to parse
     * @param {string} docId id of the current edition document being parsed (used to store data)
     * @param {string} defContentEdition string representing the definition of the starting point of the edition

     * @author CDP
     */
	parser.splitPages = function(docElement, docId, defContentEdition) {
		var matchOrphanText = '<body(.|[\r\n])*?(?=<pb)',
			sRegExInputOrphanText = new RegExp(matchOrphanText, 'ig'),
			matchesOrphanText = docElement.outerHTML.match(sRegExInputOrphanText);
		if (matchesOrphanText && matchesOrphanText.length > 0) {
			var previousDoc = parsedData.getPreviousDocument(docId);
			if (previousDoc && previousDoc.pages && previousDoc.pages.length > 0) {
				var parentPageId = previousDoc.pages[previousDoc.pages.length - 1];
				if (parentPageId && parentPageId !== '') {
					parsedData.setPageText(parentPageId, docId, 'original', matchesOrphanText[0]);
				}
			}
		}
		var match = '<pb(.|[\r\n])*?(?=(<pb|<\/' + defContentEdition + '>))';
		var sRegExInput = new RegExp(match, 'ig');
		var matches = docElement.outerHTML.match(sRegExInput);
		var totMatches = matches ? matches.length : 0;
		for (var i = 0; i < totMatches; i++) {
			var matchPbIdAttr = 'xml:id=".*"',
				sRegExPbIdAttr = new RegExp(matchPbIdAttr, 'ig'),
				pbHTMLString = matches[i].match(sRegExPbIdAttr);
			sRegExPbIdAttr = new RegExp('xml:id=(?:"[^"]*"|^[^"]*$)', 'ig');
			var idAttr = pbHTMLString ? pbHTMLString[0].match(sRegExPbIdAttr) : undefined,
				pageId = idAttr ? idAttr[0].replace(/xml:id/, '').replace(/(=|\"|\')/ig, '') : '';
			if (pageId && pageId !== '') {
				parsedData.setPageText(pageId, docId, 'original', matches[i]);
			}
		}
	};
	/**
     * @ngdoc method
     * @name evtviewer.dataHandler.evtParser#parseTextForEditionLevel
     * @methodOf evtviewer.dataHandler.evtParser
     *
     * @description
     * This method will parse the text of a given XML document on the basis of the page, document and edition level.
     * - It balances the given XHTML
     * - It replaces single spaces between elements into <code>__SPACE__</code>, otherwise they will be ignored from loop on childNode.
     * - It removes <code>pb</code> and <code>lb</code> elements since they where already handled differently
     * - It tranforms the <code>g</code> element into the text mapped in the referenced glyph for the specific edition level.
     * - It parses all <code>childNodes</code> with {@link evtviewer.dataHandler.evtParser#parseXMLElement parseXMLElement()}
     * - Finally it stores the result into {@link evtviewer.dataHandler.parsedData parsedData} for future retrievements.
	 *
	 * @param {string} pageId id of the page being parsed
	 * @param {string} docId id of the edition document being parsed
	 * @param {string} editionLevel id of the edition level being parsed
     * @param {string} docHTML string representing the original XML of the edition
	 *
	 * @returns {promise} promise that the parser will end
	 *
     * @author CDP
     */
	parser.parseTextForEditionLevel = function(pageId, docId, editionLevel, docHTML) {
	   var balancedHTMLString = parser.balanceXHTML(docHTML);
        balancedHTMLString = balancedHTMLString.replace(/> </g, '>__SPACE__<');
		var deferred = $q.defer(),
			editionText = balancedHTMLString, //TEMP
            doc = xmlParser.parse('<div id="mainContentToTranform" class="' + editionLevel + '">' + balancedHTMLString + '</div>');
		if (doc !== undefined) {
			var docDOM = doc.getElementById('mainContentToTranform');
			//remove <pb>s
			var pbNode,
				pbs = docDOM.getElementsByTagName('pb'),
				k = 0;
			while (k < pbs.length) {
				pbNode = pbs[k];
				pbNode.parentNode.removeChild(pbNode);
			}

			//remove <lb>s
			var invalidLbsSuffix;
			if (editionLevel === 'diplomatic') {
				invalidLbsSuffix = '_reg';
			} else if (editionLevel === 'interpretative') {
				invalidLbsSuffix = '_orig';
			}
			if (invalidLbsSuffix) {
				var lbs = docDOM.getElementsByTagName('lb');
				k = 0;
				while (k < lbs.length) {
					var lbNode = lbs[k];
					var lbNodeId = lbNode.getAttribute('xml:id');
					if (lbNodeId && lbNodeId !== null && lbNodeId.indexOf(invalidLbsSuffix) >= 0) {
						lbNode.parentNode.removeChild(lbNode);
					} else {
						k++;
					}
				}
			}

			var Gs = docDOM.getElementsByTagName('g');
			k = 0;
			while (k < Gs.length) {
				var gNode = Gs[k],
					ref = gNode.getAttribute('ref'),
					glyphNode = document.createElement('span');
				glyphNode.className = 'glyph';

				if (ref && ref !== '') {
					ref = ref.replace('#', '');
					var edition = editionLevel;
					edition = edition === 'interpretative' ? 'normalized' : edition;
					if (parser.isNestedInElem(gNode, 'abbr') || parser.isNestedInElem(gNode, 'orig')) {
						edition = 'diplomatic';
					}
					var glyphMappingForEdition = parsedData.getGlyphMappingForEdition(ref, edition);
					if (glyphMappingForEdition) {
						glyphNode.appendChild(angular.element(glyphMappingForEdition.element)[0]);
					}
				}
				if (glyphNode) {
					//TODO Creare direttiva apposita per GLYPHs
					gNode.parentNode.insertBefore(glyphNode, gNode.nextSibling);
				}
				gNode.parentNode.removeChild(gNode);
			}
			docDOM.innerHTML = docDOM.innerHTML.replace(/>[\s\r\n]*?</g, '><');

			angular.forEach(docDOM.children, function(elem) {
				var skip = '<pb>,<g>';
				elem.parentNode.replaceChild(parser.parseXMLElement(doc, elem, {
					skip: skip
				}), elem);
			});
			editionText = docDOM.outerHTML;
		} else {
			editionText = '<span> {{ \'TEXT_NOT_AVAILABLE\' | translate }}</span>';
		}

		if (editionText === undefined) {
			var errorMsg = '<span class="alert-msg alert-msg-error">{{\'MESSAGES.ERROR_IN_PARSING_TEXT\' | translate}} <br />{{\'MESSAGES.TRY_DIFFERENT_BROWSER_OR_CONTACT_DEVS\' | translate}}</span>';
			editionText = errorMsg;
		}

		parsedData.setPageText(pageId, docId, editionLevel, editionText);

		deferred.resolve('success');
		return deferred;
	};

	return parser;
});