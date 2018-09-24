
const DEFAULT_SETTINGS = {
    serverurl: '',
    checkinurl: '',
    submiturl: '',
    debug: false,
    key: '',
}

/**
 * Get settings that are being centrally managed for this extension via G-Admin.
 * 
 * @returns {Promise}
 */
function getManagedSettings() {
    return new Promise(function (resolve, reject) {
        try {
            chrome.storage.managed.get(null, function (adminConfig) {
                resolve(adminConfig);
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Get settings that were defined by the current chrome user.
 * 
 * @returns {Promise}
 */
function getLocalSettings() {
    return new Promise(function (resolve, reject) {
        try {
            chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
                resolve(items);
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Read settings from local file, fall back to managed settings.
 * 
 * @returns {Promise} 
 */
function getJsonSettings() {
    return new Promise(function (resolve, reject) {
        chrome.runtime.getPackageDirectoryEntry(function (dirEntry) {
            dirEntry.getFile("settings.json", undefined, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader()
                    reader.addEventListener("load", function (event) {
                        var settings = JSON.parse(reader.result);
                        console.log('Using local settings file');
                        resolve(settings);
                    });
                    reader.readAsText(file);
                });
            }, function (e) {
                reject(e);
            });
        });
    });
}