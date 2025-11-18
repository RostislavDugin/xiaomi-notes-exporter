(
    () => {
        const sendButton = document.getElementById('send-button');

        if (sendButton === null) {
            return;
        }

        let isProcessingNotes = false;

        sendButton.onclick = function (el) {
            if (isProcessingNotes) {
                // alert('We are already exporting!');

                return;
            }

            isProcessingNotes = true;

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
                    () => {}
                );
            })
        }

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Background received:', request);

            if (request.type === 'xiaomiNotesExporter') {

                if (request.message === 'started') {
                    sendButton.textContent = 'Exporting...';
                }

                if (request.message === 'finished') {
                    sendButton.textContent = 'Download';

                    isProcessingNotes = false;
                }
            }
        });
    }
)();