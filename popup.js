/**
 * The meat of ChromeSal - gets hardware information and one day will ship it to Sal.
 **/
 
 
// Set up some globals
var debug = false;
var data = {};
var report = {};
report.MachineInfo = {};
report.MachineInfo.HardwareInfo = {};
var callbackCount = 0;
var callbackTotal = 7;
var doNotSend = false;

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
  report.MachineInfo.HardwareInfo.current_processor_speed = cpu_array[1];
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
  if (callbackCount < callbackTotal || data.serial === '') {
    setTimeout(continueExec, 1000);
    return;
  }
  //Finally, do what you need
  sendData();
}

function sendData(){
  var reportPlist = PlistParser.toPlist(report);
  if (doNotSend === true) {
    console.log('Not running on a managed device, not sending report');
    return;
  }
  console.log(reportPlist);
  console.log(data);
  data.base64report = btoa(reportPlist);
  jQuery.ajax({
      type: "POST",
      url: serverURL + '/checkin/',
      data: data,
            beforeSend: function (xhr) {
          xhr.setRequestHeader ("Authorization", "Basic " + btoa("sal:" + key));
      },
      success: function(received) {
          console.log(received);
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
          console.log(deviceId);
          data.serial = deviceId;
          if (data.serial === '') {
            throw 'No Serial returned'
          }
      });
    }
    catch(err) {
      data.serial = 'abc123';
      console.log('Not a managed chrome device');
      console.log(err);
      if (debug === false) {
        doNotSend = true;
        renderStatus('Only functional on a managed Chrome OS device');
        chrome.browserAction.setIcon({
          path : "./icons/inactive_128.png"
        });
      }
    }
    callbackCount++;
}

function getExtensionVersion() {
  var version = 'NaN';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', chrome.extension.getURL('manifest.json'), false);
  xhr.send(null);
  var manifest = JSON.parse(xhr.responseText);
  return manifest.version;
}

function getSettings(){
  chrome.storage.managed.get(null, function(adminConfig) {
    console.log("chrome.storage.managed.get adminConfig: ", adminConfig);
    data.key = adminConfig['key'];
    serverURL = adminConfig['serverURL'];
  });
  console.log(data.key);
  callbackCount++;
}

function main() {
  renderStatus('Running chromesal ' +getExtensionVersion());
    
  chrome.management.getAll(function(info){
    // Extensions
    console.log(info);
  });
  
  getSettings();
  
  data.os_family = 'Linux';
  data.run_uuid = guid();
  data.sal_version = '0.0.1';
  
  getDeviceSerial();
  populateDevices();
  getCPUInfo();
  getStorageInfo();
  getOsVersion();
  getMemInfo();
  
  continueExec(report);
}
  
document.addEventListener('DOMContentLoaded', function() {
  main()
});
