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


function formatCPUInfo(cpuInfo) {
  // console.log(info);
  var cpu_array = info.modelName.split('@');
  report.MachineInfo.HardwareInfo.cpu_type = cpu_array[0].trim();
  if (report.MachineInfo.HardwareInfo.cpu_type.endsWith('CPU ')) {
    report.MachineInfo.HardwareInfo.cpu_type = report.MachineInfo.HardwareInfo.cpu_type.slice(0, -4).trim()
  }
  report.MachineInfo.HardwareInfo.current_processor_speed = cpu_array[1].trim();
}

function getOsVersion() {
  userAgentString = navigator.userAgent;
  if (/Chrome/.test(userAgentString)) {
    report.MachineInfo.os_vers = userAgentString.match('Chrome/([0-9]*\.[0-9]*\.[0-9]*\.[0-9]*)')[1];
  } else {
    report.MachineInfo.os_vers = 'UNKNOWN';
  }
}


function guid() {
  data.run_uuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}


async function continueExec() {
  // checkForData
  // sendData

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

function addManagedInstalls(report, appInventory) {
  var root = [];
  if (report.hasOwnProperty('ManagedInstalls')) {
    return report;
  }
  appInventory.forEach(function (extension) {
    if (extension.install_type == 'admin') {
      var dict = {}
      dict.name = extension.name;
      dict.display_name = extension.display_name;
      dict.installed = true;
      dict.installed_version = extension.version;
      dict.installed_size = 0;
      root.push(dict);
    }
  });

  // console.log(root);
  report.ManagedInstalls = root;
  return report;
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

  fetch(serverURL + '/checkin/', {
    method: 'post',
    headers: {
      "Authorization": "Basic " + btoa("sal:" + data.key)
    },
    body: data
  }).then(function (data) {
    return data.json();
  }).then(function (received) {
    return fetch(serverURL + '/inventory/submit/', {
      method: 'post',
      headers: {
        "Authorization": "Basic " + btoa("sal:" + data.key)
      },
      body: data
    })
  }).then(function (data) {
    return data.json();
  }).then(function (received) {
    console.log(received);
  }).catch(function (error) {
    console.log(error);
  });
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
            // data.sal_version =  manifest.version;
            // if (doNotSend == false){
            //   renderStatus('Running chromesal ' +data.sal_version);
            // }
          });
          reader.readAsText(file);
        });
      }, function (e) {
        reject(e);
      });
    });
  });
}

function removeDuplicates(arr, prop) {
  let obj = {};
  return Object.keys(arr.reduce((prev, next) => {
    if (!obj[next[prop]]) obj[next[prop]] = next;
    return obj;
  }, obj)).map((i) => obj[i]);
}

// function getExtensions() {
//     chrome.management.getAll(function(info){
//     // Extensions

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

//     }

//     callbackCount++;
//     console.log('Extension list callback');
//     });
// }

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
            // data now in reader.result
            var settings = JSON.parse(reader.result);
            console.log('Using local settings file');
            console.log(settings.debug);
            // data.key = settings.key;
            // serverURL = settings.serverurl;
            // debug = settings.debug;
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


// function notRunningMessage() {
//   console.log('Not running on a managed device, not sending report');
//   renderStatus('Only functional on a managed Chrome OS device');
//   chrome.browserAction.setIcon({
//     path : "./icons/inactive_128.png"
//   });
// }

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

  Promise.all([
    getDirectoryId(),
    getDeviceName(),
    getCPUInfo(),
    getStorageInfo(),
    getMemoryInformation(),
    getInstalledExtensions(),
    getUserInfo()
  ]).then(function (results) {
    let deviceSerial = results[0];
    let deviceName = results[1];
    let cpuInfo = results[2];
    let storageInfo = results[3];
    let memoryInfo = results[4];
    let extensions = results[5];
    let userInfo = results[6];

    console.dir(results);
  });
}

/**
 * Create the check in data in the format originally designed by gg.
 * 
 * @param {Array} results Array of promise resolutions from collect()
 */
function createCheckInData(results) {
  var data = {
    username: results[6].email
  }

  return data;
}

/**
 * Create a report object in the format originally designed by gg.
 * 
 * report
 * 
 * {
 *  MachineInfo: {
 *   HardwareInfo: {
 *   
 *   }
 *  }
 * }
 * 
 * @param {Array} results Array of promise resolutions from collect()
 */
function createReport(results) {
  let memoryTotalGB = formatMemoryInfo(results[4]);

  var report = {
    MachineInfo: {
      HardwareInfo: {}
    }
  };


}

function main() {

  getSettings().then(function (settings) {
    return collect(settings);
  }).catch(function (err) {
    console.log(err);
    // return getManagedSettings().then(function (managedSettings) {
    //   return collect(managedSettings);
    // });
  }).catch(function (err) {
    console.log(err);
  })
}

document.addEventListener('DOMContentLoaded', function () {
  main()
});
