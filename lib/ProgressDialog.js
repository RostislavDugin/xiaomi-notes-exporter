if (!("exportDialog" in window)) {
    (() => {
        const exportDialog = {
            show: null,
            update: null
        };

        window.exportDialog = exportDialog;

        function showExportDialog(totalFiles) {
            const overlay = document.createElement('div');
            const dialog = document.createElement('div');
            const title = document.createElement('h2');
            const counter = document.createElement('div');
            const progressContainer = document.createElement('div');
            const progressBar = document.createElement('div');
            const status = document.createElement('div');
            const thanksButton = document.createElement('button');

            overlay.appendChild(dialog);
            dialog.appendChild(title);
            dialog.appendChild(counter);
            dialog.appendChild(progressContainer);
            progressContainer.appendChild(progressBar);
            dialog.appendChild(status);
            dialog.appendChild(thanksButton);

            title.textContent = 'Exporting Notes';
            counter.textContent = `0/${totalFiles}`;
            status.textContent = 'Processing...';
            thanksButton.textContent = 'Thanks!';

            overlay.className = 'dialog-overlay';
            dialog.className = 'export-dialog';
            counter.className = 'file-counter';
            progressContainer.className = 'progress-container';
            progressBar.className = 'progress-bar';
            status.className = 'status-text';
            thanksButton.className = 'thanks-btn';

            thanksButton.style.display = 'none';

            document.body.appendChild(overlay);

            const updateProgress = (processedFiles) => {
                const progress = (processedFiles / totalFiles) * 100;

                progressBar.style.width = `${progress}%`;
                counter.textContent = `${processedFiles}/${totalFiles}`;

                if (processedFiles === totalFiles) {
                    status.textContent = 'Export completed';
                    thanksButton.style.display = 'block';
                }
            };

            exportDialog.update = updateProgress;

            thanksButton.addEventListener('click', () => {
                document.body.removeChild(overlay);
            });
        }

        exportDialog.show = showExportDialog;

        const progressDialogStyles = `
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.export-dialog {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.file-counter {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 1.5rem 0 1rem 0;
}

.progress-container {
  background: #e0e0e0;
  border-radius: 4px;
  margin: 0 0 1.5rem 0;
  height: 20px;
  overflow: hidden;
}

.progress-bar {
  background: #4CAF50;
  height: 100%;
  width: 0%;
  transition: width 0.3s ease;
}

.status-text {
  margin: 1rem 0;
  min-height: 1.5em;
}

.thanks-btn {
  background: #2196F3;
  color: white;
  border: none;
  padding: 0.5rem 2rem;
  border-radius: 4px;
  cursor: pointer;
  margin: 1rem auto 0 auto;
  display: block;
  font-family: inherit;
}

.thanks-btn:hover {
  background: #1976D2;
}
`;

        const progressDialogStyleSheet = document.createElement('style');
        progressDialogStyleSheet.innerText = progressDialogStyles;
        document.head.appendChild(progressDialogStyleSheet);

    })();
}
