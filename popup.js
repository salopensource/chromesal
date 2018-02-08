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
var callbackTotal = 11;
var doNotSend = false;
var appInventory = [];
var chromeOS = false;

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
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function continueExec() {
  //here is the trick, wait until var callbackCount is set number of callback functions
  if (doNotSend === true && debug === false) {
    console.log(doNotSend)
    console.log('Not running on a managed device, not sending report');
    renderStatus('Only functional on a managed Chrome OS device');
    chrome.browserAction.setIcon({
      path : "./icons/inactive_128.png"
    });
    return;
  }
  if (callbackCount < callbackTotal || checkForData() === false) {
    console.log('Waiting for data');
    setTimeout(continueExec, 1000);
    return;
  }
  //Finally, do what you need
  sendData();
}

function buildInventoryPlist(appInventory){
  // I hate you, javascript.
  var xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';

  var container = document.createElement('xml');
  var plist = document.createElement('plist');
  plist.setAttribute('version','1.0');
  container.appendChild(plist);
  var root = document.createElement('array');
  plist.appendChild(root);
  
  appInventory.forEach( function(extension){
    var dict = document.createElement('dict');
    var key = document.createElement('key');
    key.innerHTML = 'name';
    dict.appendChild(key);
    var string = document.createElement('string');
    string.innerHTML = extension.name;
    dict.appendChild(string);
    
    key = document.createElement('key');
    key.innerHTML = 'bundleid';
    dict.appendChild(key);
    string = document.createElement('string');
    string.innerHTML = extension.bundleid;
    dict.appendChild(string);
    
    key = document.createElement('key');
    key.innerHTML = 'version';
    dict.appendChild(key);
    string = document.createElement('string');
    string.innerHTML = extension.version;
    dict.appendChild(string);

    root.appendChild(dict)
  });
  
  
  return xml+container.innerHTML;
  
  
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
}

function sendData(){
  report.os_family = 'Linux';
  var reportPlist = PlistParser.toPlist(report);
  // console.log(reportPlist);
  // console.log(data);
  data.base64report = btoa(reportPlist);
  renderStatus('Running chromesal ' +data.sal_version);
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
          // console.log(buildInventoryPlist(appInventory));
          // console.log(inventoryPlist);
          data.base64inventory = btoa(inventoryPlist);
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

function getDeviceSerial() {
  try {
      chrome.enterprise.deviceAttributes.getDirectoryDeviceId(deviceId => {
          renderStatus(deviceId);
          // console.log(deviceId);
          data.serial = deviceId.toUpperCase();
          if (data.serial === '') {
            throw 'No Serial returned'
            if (debug === false) {
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
        doNotSend = true;
      }
    }
    // We are only going to run on a Chrome OS device
    is_chrome = getOsType();
    if (is_chrome === false) {
      doNotSend = true;
    }
    callbackCount++;
}

function getOsType() {
  chrome.runtime.getPlatformInfo(function(info) {
    chromeOS = false;
    if (info.os === 'cros'){
      chromeOS = true;
    } else {
      if (debug === true) {
        chromeOS = true;
      }
    }
  });
  callbackCount++;
  return chromeOS
}

function getExtensionVersion() {
  callbackCount++;
  console.log('Extension version callback');
  chrome.runtime.getPackageDirectoryEntry(function (dirEntry) {
    dirEntry.getFile("manifest.json", undefined, function (fileEntry) {
    fileEntry.file(function (file) {
            var reader = new FileReader()
            reader.addEventListener("load", function (event) {
                // data now in reader.result
                // console.log(reader.result);
                var manifest = JSON.parse(reader.result);
                console.log(manifest.version);
                data.sal_version =  manifest.version;
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
      var inventory_item = {};
      inventory_item.name = extension.name;
      inventory_item.bundleid = extension.id;
      inventory_item.version= extension.version;
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
  });
  // console.log(data.key);
  callbackCount++;
  
}

function main() {
  

  
  getSettings();
  data.run_uuid = guid();
  getExtensionVersion();
  
  getDeviceSerial();
  populateDevices();
  getCPUInfo();
  getStorageInfo();
  getOsVersion();
  getMemInfo();
  getExtensions();
  
  continueExec();
}
  
document.addEventListener('DOMContentLoaded', function() {
  main()
});
