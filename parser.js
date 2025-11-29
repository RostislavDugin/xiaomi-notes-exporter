if (!("xiaomiNotesParser" in window)) {
    (() => {
        // Export state for progress synchronization
        const exportState = {
            isRunning: false,
            processedNotes: 0,
            totalNotes: 0
        };

        function sendProgressUpdate() {
            try {
                chrome.runtime.sendMessage({
                    type: 'EXPORT_PROGRESS',
                    isRunning: exportState.isRunning,
                    processedNotes: exportState.processedNotes,
                    totalNotes: exportState.totalNotes
                });
            } catch (e) {
                // Popup might be closed, ignore the error
            }
        }

        function getExportState() {
            return {
                isRunning: exportState.isRunning,
                processedNotes: exportState.processedNotes,
                totalNotes: exportState.totalNotes
            };
        }

        window.xiaomiNotesParser = {
            runExport: null,
            getExportState: getExportState
        };

        let isRunningExport = false;

        function getBaseUrl() {
            return window.location.origin;
        }

        async function fetchNote(noteId) {
            try {
                const ts = Date.now();
                const response = await fetch(getBaseUrl() + '/note/note/' + noteId + '/?ts=' + ts);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const entry = data.data.entry;
                const extraInfo = JSON.parse(entry.extraInfo);

                return {
                    'id': entry.id,
                    'title': extraInfo.title,
                    'content': entry.content,
                    'folderId': entry.folderId,
                    'createDate': entry.createDate,
                    'modifyDate': entry.modifyDate
                };
            } catch (error) {
                console.error('Fetch error:', error);

                return null;
            }
        }

        async function getNotesPageInfo(syncTag) {
            try {
                const ts = Date.now();
                const baseUrl = getBaseUrl();

                const url = (syncTag !== null) ? baseUrl + '/note/full/page?ts=' + ts + '&syncTag=' + syncTag + '&limit=200' : baseUrl + '/note/full/page?ts=' + ts + '&limit=200';

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const dataJson = await response.json();

                const data = dataJson.data;
                const entries = data.entries;
                const notes = [];

                for (const entry of entries) {
                    if (entry.type !== 'note') {
                        continue;
                    }

                    notes.push(entry.id);
                }

                const folderData = data.folders;
                const folders = [];

                for (const folderRow of folderData) {
                    if (folderRow.type !== 'folder') {
                        continue;
                    }

                    folders.push({
                        id: folderRow.id, title: folderRow.subject
                    });
                }

                return {
                    'notes': notes, 'folders': folders, 'lastPage': data.lastPage, 'syncTag': data.syncTag
                };
            } catch (error) {
                console.error('Fetch error:', error);

                return null;
            }
        }

        async function getNotesDirectoryInfo() {
            let syncTag = null;

            const directoryInfo = {
                notes: [], folders: [],
            };

            let loopBreaker = 0;

            while (true) {
                const data = await getNotesPageInfo(syncTag);

                if (data === null) {
                    return null;
                }

                syncTag = data.syncTag;
                directoryInfo.notes = directoryInfo.notes.concat(data.notes);
                directoryInfo.folders = directoryInfo.folders.concat(data.folders);

                if (data.lastPage) {
                    break;
                }

                loopBreaker++;

                if (loopBreaker > 500) { // 100K entries aprox.
                    console.error('Too much iterations. Infinite loop?');

                    break;
                }
            }

            return directoryInfo;
        }

        function isSupportedHost() {
            const supportedHosts = ['us.i.mi.com', 'i.mi.com'];
            return supportedHosts.includes(window.location.host);
        }

        async function parse() {
            if (!isSupportedHost()) {
                alert('This extension is working only on Xiaomi Cloud site. Please go to Xiaomi Cloud site (i.mi.com or us.i.mi.com), open Notes section and try again.');

                return;
            }

            const notesDirectoryInfo = await getNotesDirectoryInfo();

            if (notesDirectoryInfo === null) {
                return null;
            }

            const exportDialog = window.exportDialog;
            const xmlToMarkdownConverter = window.xmlToMarkdownConverter;

            const notes = [];
            const totalNotes = notesDirectoryInfo.notes.length;
            exportDialog.show(totalNotes);
            
            // Update export state for progress sync
            exportState.totalNotes = totalNotes;
            exportState.processedNotes = 0;
            sendProgressUpdate();
            
            let processedNotes = 0;

            for (const noteIndexEntry of notesDirectoryInfo.notes) {
                const note = await fetchNote(noteIndexEntry);
                note.content = xmlToMarkdownConverter.xmlToMarkdown(note.content);
                notes.push(note);
                processedNotes++;
                exportDialog.update(processedNotes);
                
                // Update export state and send progress
                exportState.processedNotes = processedNotes;
                sendProgressUpdate();

                // На время тестирования ограничиваем 100 заметок чтобы не ждать долго
                if (processedNotes === 100) {
                    break;
                }
            }

            const result = {
                notesCount: notes.length, notes: notes, folders: notesDirectoryInfo.folders,
            };

            return result;
        }

        async function tryParse() {
            let result = null;

            try {
                result = await parse();
            } catch (e) {
                console.error(e);
                alert('Ошибка при сканировании страницы');

                return null;
            }

            return result;
        }

        function downloadJson(jsonObject, filename) {
            const jsonString = JSON.stringify(jsonObject, null, 4);
            const blob = new Blob([jsonString], {type: "application/json"});
            const objectUrl = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = filename;

            document.body.appendChild(a); // Append to body is optional, but ensures it's in the DOM for click
            a.click();
            document.body.removeChild(a); // Remove after click if it was appended

            URL.revokeObjectURL(objectUrl);
        }

        function createZipArchive(data) {
            const zip = new JSZip();

            const folderMap = {};

            data.folders.forEach(folder => {
                folderMap[folder.id] = folder.title;
            });

            data.notes.forEach(note => {
                let fileName = '';

                if (note.title && note.title.trim() !== '') {
                    fileName = note.title.replace(/[<>:"/\\|?*]/g, '_') + '.txt';
                } else {
                    fileName = `note_${note.id}.txt`;
                }

                if (note.folderId && note.folderId !== 0 && folderMap[note.folderId]) {
                    const folderName = folderMap[note.folderId];
                    zip.folder(folderName).file(fileName, note.content);
                } else {
                    zip.file(fileName, note.content);
                }
            });

            return zip;
        }

        async function runExport() {
            if (isRunningExport) {
                console.log('Already exporting.');

                return;
            }

            isRunningExport = true;
            exportState.isRunning = true;
            exportState.processedNotes = 0;
            exportState.totalNotes = 0;
            sendProgressUpdate();

            const content = await tryParse();

            if (content === null) {
                console.log('No notes found. Nothing to export.');
                isRunningExport = false;
                exportState.isRunning = false;
                sendProgressUpdate();

                return;
            }

            try {
                const zip = createZipArchive(content);

                zip.generateAsync({type: 'blob'})
                    .then(function (content) {
                        saveAs(content, 'notes_archive.zip');
                        // statusDiv.innerHTML = 'ZIP is created and downloaded!';
                    })
                    .catch(function (error) {
                        console.error('Failed to create ZIP:', error);
                        // statusDiv.innerHTML = 'Failed to create ZIP.';
                    });
            } catch (error) {
                console.error('Error:', error);
                // statusDiv.innerHTML = 'Unexpected error: ' + error.message;
            }

            isRunningExport = false;
            exportState.isRunning = false;
            sendProgressUpdate();
        }

        window.xiaomiNotesParser.runExport = runExport;
    })();
}
