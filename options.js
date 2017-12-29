// Lets the user know we've saved thier options
function options_saved_display(message, timeout=750) {
   var status = document.getElementById('status');
    status.textContent = message;
    if (timeout !== 0) {
      setTimeout(function() {
        status.textContent = '';
      }, timeout);
      
    }
}

// Saves options to chrome.storage.sync.
function save_options() {

  var serverURL = document.getElementById('serverURL').value;
  var key = document.getElementById('key').value;
  var message = 'Options saved.'

  chrome.storage.local.set({
    serverURL: serverURL,
    key: key
  }, options_saved_display(message));
  
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value serverURL = 'http://sal' and key = ''.
  chrome.storage.local.get({
    serverURL: 'http://sal',
    key: '',
    usingManaged: false,
  }, function(items) {
    if (usingManaged === true){
      options_saved_display('These options have been set by your administrator and cannot be changed.', 0);
      document.getElementById('save').disabled = true;
    }
    document.getElementById('serverURL').value = items.serverURL;
    document.getElementById('key').value = items.key;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);