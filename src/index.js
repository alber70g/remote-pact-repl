
      const editor = ace.edit('editor');
      editor.setTheme('ace/theme/monokai');
      editor.session.setMode('ace/mode/lisp');
      setTimeout(() => {
        editor.focus();
      }, 200);

      const output = document.getElementById('output');

      // Create a new WebSocket connection
      let ws;
      function connect() {
        let retryInterval = 1000; // initial retry interval is 1 second
        ws = new WebSocket(
          `${location.protocol === 'http:' ? 'ws' : 'wss'}://${
            location.hostname
          }:${location.port}/ws`,
        );
        ws.addEventListener('open', () => {
          console.log('WebSocket connection established');
          retryInterval = 1000; // reset retry interval to 1 second on successful connection
        });
        ws.addEventListener('close', () => {
          console.log('WebSocket connection closed');
          setTimeout(() => {
            console.log('WebSocket connection retrying...');
            connect();
            retryInterval = Math.min(retryInterval * 2, 10000); // double retry interval, up to a maximum of 10 seconds
          }, retryInterval);
        });
        ws.addEventListener('message', (event) => {
          console.log(
            'msg: ' + JSON.stringify(JSON.parse(event.data), null, 2),
          );
          const message = JSON.parse(event.data);
          if (message.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'output-div'; // Add class to separate each output
            errorDiv.innerHTML =
              '<pre>' + JSON.stringify(message.error, null, 2) + '</pre>';
            output.prepend(errorDiv);
            if (message.stderr) {
              const stderrDiv = document.createElement('div');
              stderrDiv.className = 'output-div'; // Add class to separate each output
              stderrDiv.innerHTML =
                '<pre>' + message.stderr.split('\n').join('<br />') + '</pre>';
              output.prepend(stderrDiv);
            }
          } else {
            const stdoutDiv = document.createElement('div');
            stdoutDiv.className = 'output-div'; // Add class to separate each output
            stdoutDiv.innerHTML =
              '<pre>' + message.stdout.split('\n').join('<br />') + '</pre>';
            output.prepend(stdoutDiv);
          }
        });
      }
      connect();

      // Load the intermediate code from local storage, if it exists
      const intermediateCode = localStorage.getItem('intermediateCode');
      if (intermediateCode) {
        editor.setValue(intermediateCode);
      }

      // Get the query string parameter value for 'input' and set it as the prefilled value for the input
      const urlParams = new URLSearchParams(window.location.search);
      const inputParam = urlParams.get('input');
      if (inputParam) {
        editor.setValue(inputParam);
      }

      // Get the query string parameter value for 'L' and move to that line
      const lineParam = urlParams.get('L');
      if (lineParam) {
        editor.gotoLine(lineParam);
      }

      // Send the contents of the Ace editor to the WebSocket endpoint when the user hits enter
      editor.commands.addCommand({
        name: 'sendToWebSocket',
        bindKey: { win: 'Enter', mac: 'Enter' },
        exec: function (editor) {
          const message = editor.getValue();
          ws.send(message);
          // Update the query string parameter value for 'input' with the new input value
          urlParams.set('input', message);
          window.history.replaceState(
            {},
            '',
            `${location.pathname}?${urlParams}`,
          );
        },
        readOnly: false, // allow the user to type in the Ace editor
      });

      // Save the intermediate code to local storage when the user types in the Ace editor
      editor.session.on('change', () => {
        const intermediateCode = editor.getValue();
        localStorage.setItem('intermediateCode', intermediateCode);
      });

      // Set the keyboard mode based on the selected option
      const keyboardModeSelect = document.getElementById(
        'keyboard-mode-select',
      );
      const storedKeyboardHandler = localStorage.getItem('keyboardHandler');
      if (storedKeyboardHandler) {
        editor.setKeyboardHandler(storedKeyboardHandler);
        keyboardModeSelect.value = storedKeyboardHandler.split('/').pop();
      }
      keyboardModeSelect.addEventListener('change', () => {
        const selectedOption = keyboardModeSelect.value;
        if (selectedOption === 'normal') {
          editor.setKeyboardHandler('');
        } else if (selectedOption === 'emacs') {
          editor.setKeyboardHandler('ace/keyboard/emacs');
        } else if (selectedOption === 'vim') {
          editor.setKeyboardHandler('ace/keyboard/vim');
        }
        setTimeout(() => {
          localStorage.setItem(
            'keyboardHandler',
            editor.getKeyboardHandler().$id,
          );
        }, 200);
      });

      // Handler for cmd+s or ctrl+s
      editor.commands.addCommand({
        name: 'saveToClipboard',
        bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
        exec: function (editor) {
          const activeLine = editor.getCursorPosition().row + 1;
          const message = editor.getValue();
          const url = `${location.protocol}//${location.host}${
            location.pathname
          }?L=${activeLine}&input=${encodeURIComponent(message)}`;
          navigator.clipboard.writeText(url);
          console.log('URL copied to clipboard:', url);
          const clipboardDiv = document.createElement('div');
          clipboardDiv.className = 'output-div'; // Add class to separate each output
          const trimmedUrl =
            url.length > 150 ? url.substring(0, 150) + '...' : url;
          clipboardDiv.innerHTML =
            'Saved to clipboard: <pre>' + trimmedUrl + '</pre>';
          output.prepend(clipboardDiv);
        },
        readOnly: false,
      });
