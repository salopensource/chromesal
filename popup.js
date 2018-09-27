/**
 * The meat of ChromeSal.
 **/

function renderStatus(statusText) {
  try {
    document.getElementById('status').textContent = statusText;
  } catch (err) {
    console.log(statusText);
  }
}


/**
 * Get the directory Id for this device (if available).
 *
 * @see https://developer.chrome.com/extensions/enterprise_deviceAttributes#method-getDirectoryDeviceId
 * @returns {Promise}
 */
function getDirectoryId() {
  return new Promise(function (resolve, reject) {
    if (chrome.enterprise) {
      chrome.enterprise.deviceAttributes.getDirectoryDeviceId(function callback(deviceId) {
        resolve(deviceId);
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * Get all installed extensions for this user account.
 * 
 * @see https://developer.chrome.com/extensions/management#method-getAll
 * @returns {Promise}
 */
function getInstalledExtensions() {
  return new Promise(function (resolve, reject) {
    try {
      chrome.management.getAll(function (extensions) {
        resolve(extensions);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Prepare installed extensions into desired submission format.
 * 
 * @param {Array} extensions Array of extensions
 * 
 */
function prepareExtensions(extensions) {
  // extensions.forEach(function(extension) {

  // })

  //     if (appInventory != []) {

  //       info.forEach( function(extension){
  //         // console.logxr(extension)
  //         var inventory_item = {};
  //         inventory_item.name = extension.name;
  //         inventory_item.bundleid = extension.id;
  //         inventory_item.version= extension.version;
  //         inventory_item.install_type = extension.installType;
  //         inventory_item.description = extension.description;
  //         appInventory.push(inventory_item)
  //       });
}

/**
 * Get information about the platform runtime.
 * 
 * @see https://developers.chrome.com/extensions/runtime#method-getPlatformInfo
 * @see https://developers.chrome.com/extensions/runtime#type-PlatformInfo
 * @returns {Promise}
 */
function getRuntimeInformation() {
  return new Promise(function (resolve, reject) {
    chrome.runtime.getPlatformInfo(function (platformInfo) {
      resolve(platformInfo);
    });
  });
}

/**
 * Get information about system memory.
 * 
 * @see https://developer.chrome.com/apps/system_memory#method-getInfo
 * @returns {Promise}
 */
function getMemoryInformation() {
  return new Promise(function (resolve, reject) {
    chrome.system.memory.getInfo(function (info) {
      resolve(info);
    });
  });
}

/**
 * Format memory information.
 * 
 * @param {MemoryInformation} info 
 * @returns {String} Formatted memory in gigabytes eg. "2 GB"
 */
function formatMemoryInfo(info) {
  return (info.capacity / 1000000000).toFixed(2) + ' GB';
}

/**
 * Get information about the current Chrome users' profile.
 * 
 * @see https://developer.chrome.com/apps/identity#method-getProfileUserInfo
 * @returns {Promise}
 */
function getUserInfo() {
  return new Promise(function (resolve, reject) {
    chrome.identity.getProfileUserInfo(function (info) {
      resolve(info);
    });
  });
}

/**
 * Get Chrome device name.
 * 
 * @see https://developer.chrome.com/extensions/enterprise_deviceAttributes#method-getDeviceSerialNumber
 * @returns {Promise}
 */
function getDeviceName() {
  return new Promise(function (resolve, reject) {
    if (!chrome.enterprise) {
      console.log("Not a ChromeOS Device, Returning NULL for device name.");
      return resolve(null);
    }

    try {
      chrome.enterprise.deviceAttributes.getDeviceSerialNumber(function (deviceName) {
        resolve(deviceName);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Get Chrome CPU Info
 * 
 * @see https://developer.chrome.com/apps/system_cpu
 * @returns {Promise}
 */
function getCPUInfo() {
  return new Promise(function (resolve, reject) {
    try {
      chrome.system.cpu.getInfo(function (cpuInfo) {
        resolve(cpuInfo);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Prepare information about storage for submission.
 * 
 * @param {StorageUnitInfo} storageInfo Structure returned by storage.getInfo
 * 
 */
function prepareStorageInfo(storageInfo) {
  if (storageInfo.length === 0) {
    data.disk_size = '1';
  } else {
    data.disk_size = storageInfo[0].capacity;
    report.AvailableDiskSpace = storageInfo[0].capacity;
  }
}

/**
 * Get Chrome Storage Information
 * 
 * {
 *  "id": "...",
 *  "name": "",
 *  "type": "fixed|removable|unknown",
 *  "capacity": 12345
 * }
 * 
 * @see https://developer.chrome.com/apps/system_storage#method-getInfo
 * @see https://developer.chrome.com/apps/system_storage#type-StorageUnitInfo
 * 
 * @returns {Promise}
 */
function getStorageInfo() {
  return new Promise(function (resolve, reject) {
    try {
      chrome.system.storage.getInfo(function (storageInfo) {
        resolve(storageInfo);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Format CPU Information into the structure required for Sal.
 * 
 * @param {*} cpuInfo CPU Information
 * @returns {Object} containing keys "cpu_type" and "current_processor_speed".
 */
function formatCPUInfo(cpuInfo) {
  let cpu_array = cpuInfo.modelName.split('@');
  let cpu_type = cpu_array[0].trim();
  if (rcpu_type.endsWith('CPU ')) {
    cpu_type = cpu_type.slice(0, -4).trim()
  }

  return {
    "cpu_type": cpu_type,
    "current_processor_speed": cpu_array[1].trim()
  };
}

/**
 * Extract the Chrome version from the User Agent.
 * 
 * @returns {String} Chrome version
 */
function getOsVersion() {
  userAgentString = navigator.userAgent;
  if (/Chrome/.test(userAgentString)) {
    report.MachineInfo.os_vers = userAgentString.match('Chrome/([0-9]*\.[0-9]*\.[0-9]*\.[0-9]*)')[1];
  } else {
    report.MachineInfo.os_vers = 'UNKNOWN';
  }
}


function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function s4() {
  let s = Math.floor(Math.random() * (16 << 12)).toString(16);
  if (s.length == 3) { 
    return "0" + s; 
  } else {
    return s;
  }
}

function buildInventoryPlist(appInventory) {
  var plistroot = []
  appInventory.forEach(function (extension) {

    dict = {}
    dict.bundleid = extension.bundleid;
    dict.version = extension.version;
    dict.CFBundleName = extension.name;
    dict.name = extension.name;

    plistroot.push(dict)
  });

  plistroot = removeDuplicates(plistroot, 'bundleid')


  return PlistParser.toPlist(plistroot);

}

/**
 * Predicate used to filter out admin forced extensions.
 * 
 * @param {Object} extension An installed chrome extension
 */
function isManagedInstall(extension) {
  return extension.install_type == 'admin';
}


// function addManagedInstalls(report, appInventory) {
//   var root = [];
//   if (report.hasOwnProperty('ManagedInstalls')) {
//     return report;
//   }
//   appInventory.forEach(function (extension) {
//     if (extension.install_type == 'admin') {
//       var dict = {}
//       dict.name = extension.name;
//       dict.display_name = extension.display_name;
//       dict.installed = true;
//       dict.installed_version = extension.version;
//       dict.installed_size = 0;
//       root.push(dict);
//     }
//   });

//   // console.log(root);
//   report.ManagedInstalls = root;
//   return report;
// }

/**
 * Submit a Check-in
 * 
 * @param {Object} checkinData Object literal containing check in data to be submitted as JSON.
 * @param {Object} settings Object literal containing the extension settings.
 * @returns {Promise} A promise that resolves with the json response.
 */
function checkIn(checkinData, settings) {
  const checkInURL = settings.checkInURL || settings.serverurl + '/checkin/';

  return fetch(checkInURL, {
    method: 'post',
    headers: {
      "Authorization": "Basic " + btoa("sal:" + settings.key),
      "Content-Type": "application/json;charset=utf-8",
      "Accept": "application/json;charset=utf-8",
    },
    body: JSON.stringify(checkinData)
  }).then(function (data) {
    return data.json();
  });
}

/**
 * Submit Full Inventory Data.
 * 
 * @param {Object} inventoryData Inventory data
 * @param {Object} settings Object literal containing the extension settings.
 * @returns {Promise} A promise that resolves with the json response.
 */
function submitInventory(inventoryData, settings) {
  const submitURL = settings.submitURL || settings.serverurl + '/inventory/submit/';

  return fetch(submitURL, {
    method: 'post',
    headers: {
      "Authorization": "Basic " + btoa("sal:" + data.key),
      "Content-Type": "application/json;charset=utf-8",
      "Accept": "application/json;charset=utf-8",
    },
    body: JSON.stringify(inventoryData)
  }).then(function (data) {
    return data.json();
  })
}

function sendData() {
  report.os_family = 'ChromeOS';

  report = addManagedInstalls(report, appInventory);
  var reportPlist = PlistParser.toPlist(report);
  var inventoryPlist = buildInventoryPlist(appInventory);
  // console.log(reportPlist);
  // console.log(data);
  data.base64report = btoa(reportPlist);
  data.base64inventory = btoa(unescape(encodeURIComponent(inventoryPlist)));
  // console.log(inventoryPlist)
  // console.log(buildInventoryPlist(appInventory));
  // console.log(data)
  if (debug === true) {
    console.log(data);
  }
  // console.log(buildInventoryPlist(appInventory));

  
}

/**
 * Get information about the ChromeSal Extension.
 * 
 * Mainly used to determine the current version of the extension.
 * 
 * @returns {Promise}
 */
function getExtensionVersion() {
  return new Promise(function (resolve, reject) {
    chrome.runtime.getPackageDirectoryEntry(function (dirEntry) {
      dirEntry.getFile("manifest.json", undefined, function (fileEntry) {
        fileEntry.file(function (file) {
          var reader = new FileReader()
          reader.addEventListener("load", function (event) {
            var manifest = JSON.parse(reader.result);
            resolve(manifest);
          });
          reader.readAsText(file);
        });
      }, function (e) {
        reject(e);
      });
    });
  });
}


/**
 * Read settings from local file, fall back to managed settings.
 * 
 * @returns {Promise} 
 */
function getSettings() {
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
 * Collect all information for submission.
 * 
 * @param {*} settings Object literal containing settings.
 */
function collect(settings) {
  console.dir(settings);

  if (!settings.serverurl) {
    throw new TypeError("Settings does not contain a `serverurl` key. We cannot submit data to a server.");
  }

  return Promise.all([
    getDirectoryId(),
    getDeviceName(),
    getCPUInfo(),
    getStorageInfo(),
    getMemoryInformation(),
    getInstalledExtensions(),
    getUserInfo(),
    getExtensionVersion(),
  ]).then(function (results) {
    let deviceSerial = results[0];
    let deviceName = results[1];
    let cpuInfo = results[2];
    let storageInfo = results[3];
    let memoryInfo = results[4];
    let extensions = results[5];
    let userInfo = results[6];
    let manifest = results[7];

    console.dir(results);

    let report = createReport(results);
    let checkinData = createCheckInData(results);

    return [checkinData, report, settings];
  });
}

/**
 * Create the check in data in the format originally designed by gg.
 * 
 * @param {Array} results Array of promise resolutions from collect()
 */
function createCheckInData(results) {
  var data = {
    name: results[1] ? results[1] : "Chrome OS Device",
    username: results[6].email,
    run_uuid: guid(),
    key: 'key',
    sal_version: results[7].version,
    serial: results[0] ? results[0].toUpperCase() : 'ABC123',
  }

  console.log(data);

  return data;
}

/**
 * Create a report object in the format originally designed by gg.
 * Described in `sal/3rdpartyclients.md`.
 * 
 * @param {Array} results Array of promise resolutions from collect()
 */
function createReport(results) {
  let deviceSerial = results[0];
  let deviceName = results[1];
  let cpuInfo = results[2];
  let storageInfo = results[3];
  let memoryInfo = results[4];
  let extensions = results[5];
  let userInfo = results[6];
  let manifest = results[7];

  let memoryTotalGB = formatMemoryInfo(memoryInfo);
  let cpuInfoFormatted = formatCPUInfo(cpuInfo);

  var report = {    
    ManagedInstalls: extensions.filter(isManagedInstall),
    MachineInfo: {
      "os_vers": getOsVersion(),
      "disk_size": storageInfo.length > 0 ? storageInfo[0].capacity : null,
      "os_family": "ChromeOS",
      HardwareInfo: {
        cpu_type: cpuInfoFormatted.cpu_type,
        current_processor_speed: cpuInfoFormatted.current_processor_speed,
        physical_memory: memoryTotalGB,
      }
    }
  };

  return report;
}

function main() {

  getSettings().then(collect).then(function (collection) {
    console.log(collection);
    return checkIn(collection[0], collection[2]);
  }).then(function (checkinResponse) {
    
  }).catch(function (err) {
    console.log(err);
  })
}

document.addEventListener('DOMContentLoaded', function () {
  main()
});
