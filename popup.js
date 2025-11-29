(
    () => {
        console.log('Starting popup logic');

        const sendButton = document.getElementById('send-button');
        const progressContainer = document.getElementById('progress-container');
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');

        if (sendButton === null) {
            return;
        }

        let isProcessingNotes = false;

        // Update progress UI based on export state
        function updateProgressUI(state) {
            if (!state) {
                return;
            }

            isProcessingNotes = state.isRunning;
            sendButton.textContent = isProcessingNotes ? 'Exporting...' : 'Download';
            sendButton.disabled = isProcessingNotes;

            if (state.isRunning && state.totalNotes > 0) {
                progressContainer.style.display = 'block';
                progressText.textContent = `${state.processedNotes}/${state.totalNotes}`;
                const percent = (state.processedNotes / state.totalNotes) * 100;
                progressBar.style.width = `${percent}%`;
            } else if (!state.isRunning) {
                progressContainer.style.display = 'none';
            }
        }

        sendButton.textContent = isProcessingNotes ? 'Exporting...' : 'Download';

        // Listen for progress updates from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'EXPORT_PROGRESS') {
                updateProgressUI({
                    isRunning: message.isRunning,
                    processedNotes: message.processedNotes,
                    totalNotes: message.totalNotes
                });
            }
        });

        sendButton.onclick = function (el) {
            function parserRunExport() {
                if ("xiaomiNotesParser" in window) {
                    window.xiaomiNotesParser.runExport();
                }
            }

            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                chrome.scripting.executeScript(
                    {
                        target: {tabId: tabs[0].id},
                        func: parserRunExport,
                    },
                    () => {
                    }
                );
            });
        }

        // Injecting content scripts
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.scripting.executeScript(
                {
                    target: {tabId: tabs[0].id},
                    files: [
                        'lib/jszip.js',
                        'lib/FileSaver.js',
                        'lib/convert.js',
                        'lib/ProgressDialog.js',
                        'parser.js'
                    ],
                },
                () => {
                    // After scripts are injected, query current export state
                    queryCurrentExportState(tabs[0].id);
                }
            );
        });

        // Query current export state from the page
        function queryCurrentExportState(tabId) {
            function getExportStateFromPage() {
                if ("xiaomiNotesParser" in window && window.xiaomiNotesParser.getExportState) {
                    return window.xiaomiNotesParser.getExportState();
                }
                return null;
            }

            chrome.scripting.executeScript(
                {
                    target: {tabId: tabId},
                    func: getExportStateFromPage,
                },
                (results) => {
                    if (results && results[0] && results[0].result) {
                        updateProgressUI(results[0].result);
                    }
                }
            );
        }
    }
)();
