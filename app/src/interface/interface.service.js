angular.module('evtviewer.interface')

.service('evtInterface', function(evtCommunication, evtCriticalParser, evtCriticalApparatusEntry, config, $routeParams, parsedData, evtReading, $q) {
    var mainInterface = {};
        var state = {
            currentViewMode  : undefined,
            currentDoc       : undefined,
            currentPage      : undefined,
            currentWits      : undefined,
            currentWitsPages : undefined,
            currentEdition   : undefined,
            currentAppEntry  : undefined,
            isLoading        : true,
            isPinnedAppBoardOpened : false,
            secondaryContent : ''
        };
        var properties = {
            indexTitle         : '',
            availableViewModes : [ ]
        }

        mainInterface.boot = function() {  
            evtCommunication.getExternalConfig(config.configUrl).then(function(){
                properties.indexTitle         = config.indexTitle;
                properties.availableViewModes = config.availableViewModes;
                evtCommunication.getData(config.dataUrl).then(function () {
                    mainInterface.updateParams($routeParams);
                    // Parse critical text and entries
                    var currentDocFirstLoad = parsedData.getDocument(state.currentDoc);
                    if (currentDocFirstLoad !== undefined){
                        var promises = [];
                        // Parse critical entries
                        if (config.loadCriticalEntriesImmediately){
                            promises.push(evtCriticalParser.parseCriticalEntries(currentDocFirstLoad.content).promise);
                        }
                        // Parse critical text
                        promises.push(evtCriticalParser.parseCriticalText(currentDocFirstLoad.content, state.currentDoc).promise);
                        $q.all(promises).then(function(){
                            // Update current app entry
                            if (state.currentAppEntry !== undefined && 
                                parsedData.getCriticalEntryById(state.currentAppEntry) === undefined){
                                mainInterface.updateCurrentAppEntry('');
                                mainInterface.updateUrl();
                            }
                            state.isLoading = false;

                            // Update Pinned entries
                            var cookies = document.cookie.split(';');
                            for (var i in cookies) {
                                var cookie = cookies[i].split('=');
                                if (cookie[0].trim() === 'pinned') {
                                    var pinnedCookie = cookie[1].split(',').filter(function(el) {
                                        return el.length !== 0 && parsedData.getCriticalEntryById(el) !== undefined;
                                    });
                                    if (pinnedCookie.length > 0){
                                        evtCriticalApparatusEntry.setPinned(pinnedCookie);
                                    }
                                }
                            }
                        });
                    }
                });
            });
        };

        /* ********** */
        /* PARAMS GET */
        /* ********** */
        mainInterface.isLoading = function() {
            return state.isLoading;
        };
        
        mainInterface.isToolAvailable = function(toolName){
            return config[toolName];
        };

        mainInterface.getProperties = function(){
            return properties;
        };

        mainInterface.getProperty = function(name){
            return properties[name];
        };

        mainInterface.getAvailableViewModes = function() {
            return properties.availableViewModes;
        };

        mainInterface.getCurrentViewMode = function(){
            return state.currentViewMode;
        };

        mainInterface.getCurrentPage = function(){
            return state.currentPage;
        };

        mainInterface.getCurrentDocument = function() {
            return state.currentDoc;
        };

        mainInterface.getCurrentEdition = function(){
            return state.currentEdition;
        };

        mainInterface.getCurrentWitnesses = function(){
            return state.currentWits;
        };

        mainInterface.getCurrentWitnessesPages = function(){
            return state.currentWitsPages;
        };

        mainInterface.getCurrentWitnessPage = function(wit){
            return state.currentWitsPages[wit];
        };

        mainInterface.getCurrentAppEntry = function(){
            return state.currentAppEntry;
        };

        mainInterface.existCriticalText = function(){
            return parsedData.getCriticalText(state.currentDoc) !== undefined;
        };

        mainInterface.isPinnedAppBoardOpened = function() {
            return state.isPinnedAppBoardOpened;
        };

        mainInterface.getPinnedEntries = function() {
            return evtCriticalApparatusEntry.getPinned();
        };

        mainInterface.getSecondaryContentOpened = function(){
            return state.secondaryContent;
        };

        /* ************** */
        /* PARAMS UPDATES */
        /* ************** */
        mainInterface.setLoading = function(state) {
            state.isLoading = state;
        };

        mainInterface.togglePinnedAppBoardOpened = function() {
            state.isPinnedAppBoardOpened = !state.isPinnedAppBoardOpened;
        };
        
        mainInterface.updateSecondaryContentOpened = function(secondaryContent){
            state.secondaryContent = secondaryContent;
        };
        
        mainInterface.updateCurrentViewMode = function(viewMode) {
            state.currentViewMode = viewMode;
        };

        mainInterface.updateCurrentPage = function(pageId) {
            state.currentPage = pageId;
        };

        mainInterface.updateCurrentDocument = function(docId) {
            state.currentDoc = docId;
        };

        mainInterface.updateCurrentEdition = function(edition){
            state.currentEdition = edition;
        };

        // WITNESS
        mainInterface.updateWitnessesPage = function(witness, pageId) {
            state.currentWitsPages[witness] = pageId;
        };
        mainInterface.updateCurrentWitnesses = function(witIds) {
            state.currentWits = witIds;
        };
        mainInterface.updateCurrentWitnessesPages = function(witPages) {
            state.currentWitsPages = witPages;
        };
        mainInterface.addWitness = function(newWit) {
            //TODO: Decide where to add the new witness: either before or after the others
            // if (mainInterface.existCriticalText()) {
            //     state.currentWits.unshift(newWit);
            // } else {
                state.currentWits.push(newWit);
            // }

            //TODO: Add scroll to new box added
        };
        mainInterface.addWitnessAtIndex = function(newWit, index) {
            state.currentWits.splice(index, 0, newWit);
        };
        mainInterface.removeWitness = function(wit) {
            var witIndex = state.currentWits.indexOf(wit);
            if (witIndex >= 0) {
                state.currentWits.splice(witIndex, 1);
                delete state.currentWitsPages[wit];
            }
        };
        mainInterface.switchWitnesses = function(oldWit, newWit) {
            // se il testimone che sto selezionando è già visualizzato 
            // lo scambio con il vecchio testimone
            var newWitOldIndex = state.currentWits.indexOf(newWit),
                oldWitOldIndex = state.currentWits.indexOf(oldWit);
            if (newWitOldIndex >= 0) {
                state.currentWits[newWitOldIndex] = oldWit;
            }
            state.currentWits[oldWitOldIndex] = newWit;
            //TODO: update box scroll to page on switching...
        };
        
        // app entry
        mainInterface.updateCurrentAppEntry = function(appEntryId) {
            state.currentAppEntry = appEntryId;
        };
        mainInterface.updateParams = function(params) {
            var viewMode = config.defaultViewMode,
                edition  = config.defaultEdition,
                pageId,
                docId,
                witnesses,
                witIds = [],
                witPageIds = {},
                appId;

            // VIEW MODE 
            if (params.viewMode !== undefined) {
                viewMode = params.viewMode;
            }

            // EDITION 
            if (params.edition !== undefined ) {
                edition = params.edition;
            } else {
                if (viewMode === 'critical') {
                    edition = 'critical';
                }
            }

            // PAGE
            if ( params.pageId !== undefined ) {
                pageId = params.pageId;
            } else {
                var pages = parsedData.getPages();
                if (pages.length > 0) {
                    pageId = pages[pages[0]].value || undefined;
                }
            }

            // DOCUMENT
            if ( params.d !== undefined && parsedData.getDocument(params.d) !== undefined ) {
                docId  = params.d;
            } else {
                var documents = parsedData.getDocuments();
                if (documents.length > 0) {
                    docId = documents[documents[0]].value || undefined;
                }
            }
            // WITNESSES
            if (params.ws !== undefined) {
                witnesses = params.ws.split(',').filter(function(el) {return el.length !== 0;});
                for (var w in witnesses) {
                    var wit     = witnesses[w].split('@')[0],
                        witPage = witnesses[w].split('@')[1];
                    if (parsedData.getWitness(wit) !== undefined){
                        witIds.push(wit);
                        if (witPage !== undefined && parsedData.getPage(wit+'-'+witPage) !== undefined){
                            witPageIds[wit] = witPage;
                        }
                    }
                }
            } else if (viewMode === 'collation'){
                witIds = parsedData.getWitnessesList();
                if (witIds.length > config.maxWitsLoadTogether) {
                    witIds = witIds.slice(0, config.maxWitsLoadTogether);
                }
            }
            
            // APP ENTRY
            if ( params.app !== undefined ) {
                appId  = params.app;
            }

            if ( viewMode !== undefined ) {
                mainInterface.updateCurrentViewMode(viewMode);
            }

            if ( edition !== undefined ) {
                mainInterface.updateCurrentEdition(edition);
            } else if (viewMode === 'collation'){
                mainInterface.updateCurrentEdition('critical');
            }

            if ( pageId !== undefined ) {
                mainInterface.updateCurrentPage(pageId);
            }

            if ( docId !== undefined ) {
                mainInterface.updateCurrentDocument(docId);
            }

            if ( witIds !== undefined) {
                mainInterface.updateCurrentWitnesses(witIds);
            }

            if ( witPageIds !== {}) {
                mainInterface.updateCurrentWitnessesPages(witPageIds);
            }

            if ( appId !== undefined) {
                mainInterface.updateCurrentAppEntry(appId);
                evtReading.setCurrentAppEntry(appId);
            }
            mainInterface.updateUrl();
        };

        mainInterface.updateUrl = function() {
            var viewMode   = state.currentViewMode,
                searchPath = '';

                searchPath += state.currentDoc === undefined ? '' : (searchPath === '' ? '' : '&')+'d='+state.currentDoc;
                searchPath += state.currentPage === undefined ? '' : (searchPath === '' ? '' : '&')+'p='+state.currentPage;
                searchPath += state.currentEdition === undefined ? '' : (searchPath === '' ? '' : '&')+'e='+state.currentEdition;
                if (viewMode === 'collation') {
                    if (state.currentWits !== undefined && state.currentWits.length > 0) {
                        if (searchPath !== '') {
                          searchPath += '&';  
                        }
                        searchPath += 'ws=';
                        for (var w in state.currentWits){
                            var wit = state.currentWits[w],
                                currentPage = mainInterface.getCurrentWitnessPage(wit);
                            searchPath += wit;
                            if (currentPage !== undefined){
                                searchPath += '@'+currentPage;
                            }
                            if (w < state.currentWits.length-1) {
                                searchPath += ',';
                            }
                        }
                    }
                }
                if (state.currentAppEntry !== undefined && state.currentAppEntry !== '') {
                    if (searchPath !== '') {
                      searchPath += '&';  
                    }
                    searchPath += 'app='+state.currentAppEntry;
                }
                
            if (viewMode !== undefined) {
                // window.history.pushState(null, null, '#/'+viewMode+'?'+searchPath.substr(1));
                window.location = '#/'+viewMode+'?'+searchPath;
            }
        };
    return mainInterface;
});