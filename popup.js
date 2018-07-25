/**
 * The meat of ChromeSal.
 **/
 
 
// Set up some globals
var debug = false;
var data = {};
data.sal_version = '';
var report = {};
report.MachineInfo = {};
report.MachineInfo.HardwareInfo = {};
var callbackCount = 0;
var callbackTotal = 9;
var doNotSend = false;
var appInventory = [];
var settingsSet = false;

var key = '';
var serverURL = '';

function renderStatus(statusText) {
  try {
    document.getElementById('status').textContent = statusText;
  } catch(err) {
    console.log(statusText);
  }
}

function sendBackDeviceName(devices){
  callbackCount++;
  data.name = devices[0].name;
}

function populateDevices() {
  // Get the list of devices and display it.
  try {
    // Oh why is this only avaialble when running Dev??
    chrome.signedInDevices.get(true, sendBackDeviceName);
  }
  catch(err) {
    callbackCount++;
    data.name = 'Chrome OS Device';
  }
  
}

function getCPUInfo() {
  chrome.system.cpu.getInfo(sendBackCPUInfo);
}

function sendBackCPUInfo(info) {
  // console.log(info);
  var cpu_array = info.modelName.split('@');
  report.MachineInfo.HardwareInfo.cpu_type = cpu_array[0].trim();
  if (report.MachineInfo.HardwareInfo.cpu_type.endsWith('CPU ')){
    report.MachineInfo.HardwareInfo.cpu_type = report.MachineInfo.HardwareInfo.cpu_type.slice(0, -4).trim()
  }
  report.MachineInfo.HardwareInfo.current_processor_speed = cpu_array[1].trim();
  callbackCount++;
}

function getOsVersion() {
  userAgentString = navigator.userAgent;
	if (/Chrome/.test(userAgentString)) {
		report.MachineInfo.os_vers = userAgentString.match('Chrome/([0-9]*\.[0-9]*\.[0-9]*\.[0-9]*)')[1];
  } else {
    report.MachineInfo.os_vers = 'UNKNOWN';
  }
  callbackCount++;
}

function sendBackStorageInfo(info) {
  callbackCount++;
  // console.log(info);
  if (info.length === 0) {
    data.disk_size = '1';
  } else {
    data.disk_size = info[0].capacity;
    report.AvailableDiskSpace = info[0].capacity;
  }
}

function getStorageInfo() {
  chrome.system.storage.getInfo(sendBackStorageInfo);
}

function getMemInfo() {
  chrome.system.memory.getInfo(sendBackMem);
}

function sendBackMem(info) {
  // console.log(info);
  report.MachineInfo.HardwareInfo.physical_memory = (info.capacity/1000000000).toFixed(2) + ' GB';
  callbackCount++;
}

function guid() {
  callbackCount++;
  data.run_uuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function waitForSettings() {
  // Wait for settings to have run before carrying on
  if (settingsSet !== true) {
    console.log('Waiting for settings');
    setTimeout(waitForSettings, 1000);
  }
}


function waitForSettings(callback) {
  if (settingsSet === true) {
    callback && callback();
  } else {
    setTimeout(waitForSettings, 1000, callback);
  }
}

async function continueExec() {
  data_check = await checkForData();
  //here is the trick, wait until var callbackCount is set number of callback functions
  if (doNotSend === true && debug === false) {
    notRunningMessage();
    return;
  }
  if (callbackCount < callbackTotal || data_check === false) {
    console.log('Waiting for data');
    setTimeout(continueExec, 1000);
    return;
  }
  //Finally, do what you need
  setTimeout(sendData, 2000);
}

function buildInventoryPlist(appInventory){
  // I hate you, javascript.
  // var xml = '<?xml version="1.0" encoding="UTF-8"?>';
  // xml += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';

  // var container = document.createElement('xml');
  // var plist = document.createElement('plist');
  // plist.setAttribute('version','1.0');
  // container.appendChild(plist);
  // var root = document.createElement('array');
  // plist.appendChild(root);

  root = []

  appInventory.forEach( function(extension){
    // var dict = document.createElement('dict');
    // var key = document.createElement('key');
    // key.innerHTML = 'name';
    // dict.appendChild(key);
    // var string = document.createElement('string');
    // string.innerHTML = extension.name;
    // dict.appendChild(string);

    dict = {}
    dict.bundleid = extension.bundleid;
    
    // key = document.createElement('key');
    // key.innerHTML = 'bundleid';
    // dict.appendChild(key);
    // string = document.createElement('string');
    // string.innerHTML = extension.bundleid;
    // dict.appendChild(string);

    dict.version = extension.version;
    
    // key = document.createElement('key');
    // key.innerHTML = 'version';
    // dict.appendChild(key);
    // string = document.createElement('string');
    // string.innerHTML = extension.version;
    // dict.appendChild(string);

    dict.CFBundleName = extension.name;

    // key = document.createElement('key');
    // key.innerHTML = 'CFBundleName';
    // dict.appendChild(key);
    // string = document.createElement('string');
    // string.innerHTML = extension.name;
    // dict.appendChild(string);

    root.push(dict)

    // root.appendChild(dict)
  });
  
  
  return PlistParser.toPlist(root);
  
  
}

function addManagedInstalls(report, appInventory){
  var root = [];
  appInventory.forEach( function(extension){
    if (extension.install_type == 'admin') {
      var dict = {}
      dict.name = extension.name;
      dict.display_name = extension.display_name;
      dict.installed = true;
      dict.installed_version = extension.version;
      root.push(dict);
    }
  });

  console.log(root);
  report.ManagedInstalls = root;
  return report;
}

function checkForData(){
  if (data.key === '') {
    return false;
  }
  
  if (data.serial === '') {
    return false;
  }
  
  if (serverURL === '') {
    return false;
  }
  
  if (data.sal_version === '') {
    return false;
  }
  
  if (data.sal_version === null) {
    return false;
  }
  
  if (settingsSet == false){
    return false
  }
}

function sendData(){
  report.os_family = 'ChromeOS';
  
  report = addManagedInstalls(report, appInventory);
  var reportPlist = PlistParser.toPlist(report);
  console.log(reportPlist);
  // console.log(data);
  data.base64report = btoa(reportPlist);
  // console.log(data)
  if (debug===true){
    console.log(data);
  }
  // console.log(buildInventoryPlist(appInventory));
  jQuery.ajax({
      type: "POST",
      url: serverURL + '/checkin/',
      data: data,
            beforeSend: function (xhr) {
          xhr.setRequestHeader ("Authorization", "Basic " + btoa("sal:" + data.key));
      },
      success: function(received) {
          console.log(received);
          var inventoryPlist = buildInventoryPlist(appInventory);
          console.log(inventoryPlist)
          // console.log(buildInventoryPlist(appInventory));
          // console.log(inventoryPlist);
          data.base64inventory = btoa(unescape(encodeURIComponent(inventoryPlist)));
          // console.log(data);
          jQuery.ajax({
              type: "POST",
              url: serverURL + '/inventory/submit/',
              data: data,
                    beforeSend: function (xhr) {
                  xhr.setRequestHeader ("Authorization", "Basic " + btoa("sal:" + data.key));
              },
              success: function(received) {
                  console.log(received);
              },
              error: function(received) {
                  // console.log(received.responseText);
              }
          });
      },
      error: function(received) {
          console.log(received.responseText);
      }
  });

}

async function getDeviceSerial() {
  // We are only going to run on a Chrome OS device
  chrome.runtime.getPlatformInfo(async function(info) {
    //console.log(info)
    if (!info.os.toLowerCase().includes('cros')){
      if (debug === false) {
        console.log('Not cros and not debug')
        doNotSend = true;
      }
    }
  });
  // console.log('Is chrome: '+is_chrome);
  // if (is_chrome === false) {
  //   doNotSend = true;
  //   // notRunnngMessage();
  // }

  try {
      chrome.enterprise.deviceAttributes.getDirectoryDeviceId(async deviceId => {
          // renderStatus(deviceId);
          // console.log(deviceId);
          data.serial = deviceId.toUpperCase();
          if (data.serial === '') {
            throw 'No Serial returned'
            if (debug === false) {
              console.log('setting do not send to true due to no serial being returned and not being debug')
              doNotSend = true;
            }
          }
      });
    }
    catch(err) {
      data.serial = 'abc123'.toUpperCase();
      console.log('Not a managed chrome device');
      if (debug === true){
        console.log(err);
      }
      if (debug === false) {
        console.log('setting do not send to trye due to no serial error and not being debug')
        doNotSend = true;
      }
    }
    callbackCount++;
}

function getExtensionVersion() {
  callbackCount++;
  chrome.runtime.getPackageDirectoryEntry(function (dirEntry) {
    dirEntry.getFile("manifest.json", undefined, function (fileEntry) {
    fileEntry.file(function (file) {
            var reader = new FileReader()
            reader.addEventListener("load", function (event) {
                // data now in reader.result
                // console.log(reader.result);
                var manifest = JSON.parse(reader.result);
                data.sal_version =  manifest.version;
                if (doNotSend == false){
                  renderStatus('Running chromesal ' +data.sal_version);
                }
            });
            reader.readAsText(file);
        });
    }, function (e) {
        console.log(e);
    });
  });
  
}

function getExtensions() {
    chrome.management.getAll(function(info){
    // Extensions
    
    info.forEach( function(extension){
      // console.logxr(extension)
      var inventory_item = {};
      inventory_item.name = extension.name;
      inventory_item.bundleid = extension.id;
      inventory_item.version= extension.version;
      inventory_item.install_type = extension.installType;
      inventory_item.description = extension.description;
      appInventory.push(inventory_item)
    });
    
    callbackCount++;
    console.log('Extension list callback');
    });
}

function getSettings(){
  chrome.runtime.getPackageDirectoryEntry(function (dirEntry) {
    dirEntry.getFile("settings.json", undefined, function (fileEntry) {
    fileEntry.file(function (file) {
            var reader = new FileReader()
            reader.addEventListener("load", function (event) {
                // data now in reader.result
                var settings = JSON.parse(reader.result);
                console.log('Using local settings file');
                console.log(settings.debug);
                data.key = settings.key;
                serverURL = settings.serverurl;
                debug = settings.debug;
                callbackCount++;
                settingsSet = true;
                return;
            });
            reader.readAsText(file);
        });
    }, function (e) {
        //console.log(e);
    });
  });
  chrome.storage.managed.get(null, function(adminConfig) {
    
    //console.log("chrome.storage.managed.get adminConfig: ", adminConfig);
    data.key = adminConfig['key'];
    serverURL = adminConfig['serverurl'];
    settingsSet = true;
    callbackCount++;
  });
  // console.log(data.key);
  
  
}

function notRunningMessage() {
  console.log('Not running on a managed device, not sending report');
  renderStatus('Only functional on a managed Chrome OS device');
  chrome.browserAction.setIcon({
    path : "./icons/inactive_128.png"
  });
}

function main() {
  
  getSettings();
  waitForSettings(function() {
    guid();
    getExtensionVersion();
    getDeviceSerial();
    populateDevices();
    getCPUInfo();
    getStorageInfo();
    getOsVersion();
    getMemInfo();
    getExtensions();
    
    continueExec();
  });
  
}
  
document.addEventListener('DOMContentLoaded', function() {
  main()
});
