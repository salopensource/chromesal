/**
 * The meat of ChromeSal - gets hardware information and one day will ship it to Sal.
 **/
 
 
var data = {};
var report = {};
var callbackCount = 0;

var key = 'jfba4w8bex6si8yf2ox32kdilzn5aqctltzguowsc6rwbppw03uyk3qr9g9r9jdqr6ly7tdwemf1j135pqcl83qrag4gizkg9etiakpqsd8cgvsmbnl0abw490cegduv';
var serverURL = 'https://sal-dev.grahamgilbert.com';
var deviceSerial = 'abc123';

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}

function sendBackDeviceName(devices){
  callbackCount++;
  data.name = devices[0].name;
}

function populateDevices() {
  // Get the list of devices and display it.
  chrome.signedInDevices.get(true, sendBackDeviceName);
}

function sendBackStorageInfo(info) {
  callbackCount++;
  if (info.length === 0) {
    data.disk_size = '1';
  } else {
    data.disk_size = info;
  }
}

function getStorageInfo() {
  chrome.system.storage.getInfo(sendBackStorageInfo);
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
  if (callbackCount < 2) {
    setTimeout(continueExec, 1000);
    return;
  }
  //Finally, do what you need
  sendData();
}

function sendData(){
  
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
  
document.addEventListener('DOMContentLoaded', function() {
    renderStatus('Retrieving hardware info');
    

    // chrome.system.memory.getInfo(function(info){
    //   var capacity = info.capacity;
    //   var availableCapacity = info.availableCapacity;
    //   // console.log('Total Capacity is ' + capacity);
    //   // console.log('available capacity is ' + availableCapacity);
    // });

    // chrome.system.cpu.getInfo(function(info){
    //   var procs = info.numOfProcessors;
    //   var archName = info.archName;
    //   var modelName = info.modelName;
    //   // console.log('Number of processors: ' + procs);
    //   // console.log('Arch name: ' + archName);
    //   // console.log('Model Name: ' + modelName);
    // });

    
    // chrome.management.getAll(function(info){
    //   //console.log(info)
    // });

    // chrome.enterprise.deviceAttributes.getDirectoryDeviceId(function(info){
    //   console.log(info);
    // });
    
    data.serial = deviceSerial
    data.key = key
    data.os_family = 'Linux'
    data.run_uuid = guid()
    data.sal_version = '0.0.1'
    
    populateDevices();
    getStorageInfo();
    
    var reportPlist = PlistParser.toPlist(report);
    
    console.log(reportPlist)
    
    continueExec();

});
