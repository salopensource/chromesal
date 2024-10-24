/**
plistparser.js
Adapted from:
 https://github.com/pugetive/plist_parser
 PlistParser: a JavaScript utility to process Plist XML into JSON
 @author Todd Gehman (toddgehman@gmail.com)
 Copyright (c) 2010 Todd Gehman
 
 some changes 2015 Greg Neagle (gregneagle@mac.com):
    - PlistParser.toPlist now properly generates <array> items
    - PlistParser.toPlist can output "pretty formatted" plist strings
    - collapse "<true></true>" to "<true/>" and "<false></false>" to "<false/>"
    - changes in date handling
    - attempt to handle int/float types
    - work with JavaScript objects instead of JSON strings since JSON is lossy
      with dates (dates are converted to strings, losing their "date"-ness)
 --- 
 Usage:
   var jsobject= PlistParser.parse(xmlString);
   var plistString = PlistParser.toPlist(jsobject);
 ---
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var PlistParser = {};

PlistParser.parse = function(plist_xml){
    // parses a plist (text format only) into a JavaScript object
    var parser = new DOMParser();
    plist_xml = parser.parseFromString(plist_xml, 'text/xml');
    
    var result = this._xml_to_js(plist_xml.getElementsByTagName('plist').item(0));
  return result;
};

PlistParser._xml_to_js = function(xml_node) {
  var parser = this;
  var parent_node = xml_node;
  var parent_node_name = parent_node.nodeName;

  var child_nodes = [];
  for(var i = 0; i < parent_node.childNodes.length; ++i){
    var child = parent_node.childNodes.item(i);
    if (child.nodeName != '#text'){
      child_nodes.push(child);
    };
  };
  
  switch(parent_node_name){

    case 'plist':
      
      return parser._xml_to_js(child_nodes[0]);

    case 'dict':

      var dictionary = {};
      var key_name;
      var key_value;
      for(var i = 0; i < child_nodes.length; ++i){
        var child = child_nodes[i];
        if (child.nodeName == '#text'){
          // ignore empty text children
        } else if (child.nodeName == 'key'){
          key_name = PlistParser._textValue(child.firstChild);
        } else {
          key_value = parser._xml_to_js(child);
          dictionary[key_name] = key_value;
        }
      }

      return dictionary;

    case 'array':

      var standard_array = [];
      for(var i = 0; i < child_nodes.length; ++i){
        var child = child_nodes[i];
        standard_array.push(parser._xml_to_js(child));
      }
      return standard_array;

    case 'string':

      return PlistParser._textValue(parent_node);

    case 'date':

      var textvalue = PlistParser._textValue(parent_node),
          timestamp = Date.parse(textvalue);
      if (isNaN(timestamp)) {
          if (window.console) { 
              console.error('Invalid date string in plist: ' + textvalue);
          }
          timestamp = 0; 
      }
      return new Date(timestamp);

    case 'integer':
    
      // Second argument (radix parameter) forces string to be interpreted in 
      // base 10.
      return parseInt(PlistParser._textValue(parent_node), 10);

    case 'real':
    
      return parseFloat(PlistParser._textValue(parent_node));

    case 'data':

    // TO-DO: we should define a data object so we can differentiate between
    // string and data objects
      return PlistParser._textValue(parent_node);

    case 'true':

      return true;

    case 'false':

      return false;

  };
};


PlistParser._textValue = function(node) {
  if (node.text){
    return node.text;
  } else {
    return node.textContent;
  };
};


PlistParser.toPlist = function(obj, formatted) {

  var walkObj = function(target, obj, callback){
    for(var i in obj){
      if (obj.hasOwnProperty(i)) {
          callback(target, i, obj[i]);
      }
    }
  }

  var walkArray = function(target, arr, callback){
    for (var i=0; i<arr.length; ++i) {
        callback(target, null, arr[i]);
    }
  }

  var isArray = function(o) { 
      return Object.prototype.toString.call(o) == '[object Array]'; }

  var isInt = function(n) {
     return n % 1 === 0;
  }

  var processObject = function(target, name, value) {
    if (name) {
        var key = document.createElement('key');
        key.innerHTML = name;
        target.appendChild(key);
    }
    if (isArray(value)) {
        var arr = document.createElement('array');
        walkArray(arr, value, processObject);
        target.appendChild(arr);
    } else if (typeof value == 'object') {
        if (value instanceof Date) {
            var date = document.createElement('date');
            date.innerHTML = value.toISOString().slice(0, 19) + 'Z';
            target.appendChild(date);
        } else {
            var dict = document.createElement('dict');
            walkObj(dict, value, processObject);
            target.appendChild(dict);
        }
    } else if (typeof value == 'boolean') {
        var bool = document.createElement(value.toString());
        target.appendChild(bool);
    } else if (typeof value == 'number') {
        if (isInt(value)) {
            var num = document.createElement('integer');
        } else {
            var num = document.createElement('real');
        }
        num.innerHTML = value;
        target.appendChild(num);
    } else {
        var string = document.createElement('string');
        string.textContent = value;
        target.appendChild(string);
    }
  };
  
  var formatXml = function(xml) {
    // credit to https://gist.github.com/kurtsson/3f1c8efc0ccd549c9e31
    var formatted = '';
    var reg = /(>)(<)(\/*)/g;
    xml = xml.toString().replace(reg, '$1\r\n$2$3');
    var pad = 0;
    var nodes = xml.split('\r\n');
    for(var n in nodes) {
      var node = nodes[n];
      var indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) {
          pad -= 1;
        }
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      var padding = '';
      for (var i = 0; i < pad; i++) {
        padding += '  ';
      }

      formatted += padding + node + '\r\n';
      pad += indent;
    }
    return formatted;
  };
 
  var xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';

  var container = document.createElement('xml');
  var plist = document.createElement('plist');
  plist.setAttribute('version','1.0');
  container.appendChild(plist);

  if (isArray(obj)) {
      var root = document.createElement('array');
      plist.appendChild(root);
      walkArray(root, obj, processObject);
  } else {
      var root = document.createElement('dict');
      plist.appendChild(root);
      walkObj(root, obj, processObject);
  }
  
  var plist = container.innerHTML;
  // collapse the boolean values to something more commonly seen
  // we could collapse empty arrays and dicts, too, but I don't want to
  // since the 'expanded' version is more convenient to work with in
  // a text editor
  plist = plist.split('<true></true>').join('<true/>');
  plist = plist.split('<false></false>').join('<false/>');
  
  if (formatted) {
      // temporarily collapse empty strings so the formatting code doesn't
      // split the tags across lines
      plist = plist.split('<string></string>').join('<string/>');
      formatted_xml = formatXml(xml + plist);
      //re-expand the empty string tags
      formatted_xml = formatted_xml.split('<string/>').join('<string></string>');
      return formatted_xml;
  }
  return xml + plist;
};
var min = 5;
var max = 30;
var alarmPeriod = Math.floor(Math.random() * (max - min)) + min;

chrome.alarms.create('salAlarm', {
    delayInMinutes: 1,
    periodInMinutes: alarmPeriod
});

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === 'salAlarm') {
        main();
    }
});

// Set up some globals
var debug = false;
var data = {};
data.sal_version = '';
var report = {};
report.MachineInfo = {};
report.MachineInfo.HardwareInfo = {};
var doNotSend = false;
var appInventory = [];
var settingsSet = false;

var key = '';
var serverURL = '';

function renderStatus(statusText) {
    try {
        document.getElementById('status').textContent = statusText;
    } catch (err) {
        console.log(statusText);
    }
}

function sendBackDeviceName(device_name) {
    if (device_name) {
        data.name = device_name;
    } else {
        data.name = 'Chrome OS Device';
    }
}

function getDeviceName() {
    try {
        chrome.enterprise.deviceAttributes.getDeviceSerialNumber(sendBackDeviceName);
    } catch (err) {
        data.name = 'Chrome OS Device';
    }
}

function getConsoleUser() {
    chrome.identity.getProfileUserInfo(function (info) {
        data.username = info.email;
    });
}

function getCPUInfo() {
    chrome.system.cpu.getInfo(sendBackCPUInfo);
}

function sendBackCPUInfo(info) {
    var cpu_array = info.modelName.split('@');
    report.MachineInfo.HardwareInfo.cpu_type = cpu_array[0].trim();
    if (report.MachineInfo.HardwareInfo.cpu_type.endsWith('CPU ')) {
        report.MachineInfo.HardwareInfo.cpu_type = report.MachineInfo.HardwareInfo.cpu_type.slice(0, -4).trim();
    }
    report.MachineInfo.HardwareInfo.current_processor_speed = cpu_array[1].trim();
}

function getOsVersion() {
    var userAgentString = navigator.userAgent;
    if (/Chrome/.test(userAgentString)) {
        report.MachineInfo.os_vers = userAgentString.match('Chrome/([0-9]*\.[0-9]*\.[0-9]*\.[0-9]*)')[1];
    } else {
        report.MachineInfo.os_vers = 'UNKNOWN';
    }
}

function sendBackStorageInfo(info) {
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
    report.MachineInfo.HardwareInfo.physical_memory = (info.capacity / 1000000000).toFixed(2) + ' GB';
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

function waitForSettings(callback) {
    if (settingsSet === true) {
        callback && callback();
    } else {
        setTimeout(waitForSettings, 1000, callback);
    }
}

async function continueExec() {
    let data_check = await checkForData();

    if (doNotSend === true && debug === false) {
        notRunningMessage();
        return;
    }

    if (!data_check) {
        console.log('Waiting for data');
        setTimeout(continueExec, 1000);
        return;
    }

    setTimeout(sendData, 2000);
}

function buildInventoryPlist(appInventory) {
    var plistroot = [];
    appInventory.forEach(function (extension) {
        let dict = {};
        dict.bundleid = extension.bundleid;
        dict.version = extension.version;
        dict.CFBundleName = extension.name;
        dict.name = extension.name;

        plistroot.push(dict);
    });

    plistroot = removeDuplicates(plistroot, 'bundleid');

    return PlistParser.toPlist(plistroot);
}

function addManagedInstalls(report, appInventory) {
    report.ManagedInstalls = {};
    appInventory.forEach(function (extension) {
        if (extension.install_type == 'admin') {
            report.ManagedInstalls[extension.name] = {
                'status': 'PRESENT',
                'data': {
                    'type': "Extension"
                }
            };
        }
    });

    return report;
}

function checkForData() {
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

    if (!settingsSet) {
        return false;
    }

    return true;
}

function sal4ReportFormat(report) {
    let out = {};
    out.Machine = {};
    out.Chrome = {};
    let new_report = {
        'serial': data.serial,
        'hostname': data.serial,
        'console_user': data.username,
        'os_family': report.os_family,
        'operating_system': report.MachineInfo.os_vers,
        'hd_space': report.AvailableDiskSpace,
        'cpu_type': report.MachineInfo.cpu_type,
        'cpu_speed': report.MachineInfo.current_processor_speed,
        'memory': report.MachineInfo.HardwareInfo.physical_memory
    };

    out.Machine.extra_data = new_report;
    out.Chrome.managed_items = report.ManagedInstalls;
    out.Sal = {};
    out.Chrome.facts = { 'checkin_module_version': data.sal_version };
    out.Sal.facts = { 'checkin_module_version': data.sal_version };
    out.Machine.facts = {
        'checkin_module_version': data.sal_version,
        'google_device_id': data.google_device_identifier
    };
    out.Sal.extra_data = { 'key': data.key, 'sal_version': data.sal_version };
    return out;
}

function sendData() {
    report.os_family = 'ChromeOS';
    report = addManagedInstalls(report, appInventory);

    var reportJson = JSON.stringify(sal4ReportFormat(report));
    if (debug === true) {
        console.log(reportJson);
    }

    var inventoryPlist = buildInventoryPlist(appInventory);

    fetch(serverURL + '/checkin/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa("sal:" + key)
        },
        body: reportJson
    })
        .then(response => response.json())
        .then(received => {
            console.log(received);
            data.base64inventory = btoa(unescape(encodeURIComponent(inventoryPlist)));
            return fetch(serverURL + '/inventory/submit/', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa("sal:" + key)
                },
                body: JSON.stringify(data)
            });
        })
        .then(response => response.json())
        .then(received => {
            console.log(received);
        })
        .catch(error => {
            console.log(error);
        });
}

async function getGoogleDeviceIdentifier() {
    chrome.runtime.getPlatformInfo(async function (info) {
        if (!info.os.toLowerCase().includes('cros')) {
            if (debug === false) {
                console.log('Not cros and not debug');
                doNotSend = true;
            }
        }
    });

    try {
        chrome.enterprise.deviceAttributes.getDirectoryDeviceId(async google_deviceId => {
            data.google_device_identifier = google_deviceId.toUpperCase();
            if (data.google_device_identifier === '') {
                throw 'No Google Identifier returned';
                if (debug === false) {
                    console.log('setting do not send to true due to no serial being returned and not being debug');
                    doNotSend = true;
                }
            }
        });
    } catch (err) {
        data.google_device_identifier = 'abc123'.toUpperCase();
        console.log('Not a managed chrome device');
        if (debug === true) {
            console.log(err);
        }
        if (debug === false) {
            console.log('setting do not send to true due to no serial error and not being debug');
            doNotSend = true;
        }
    }
}

async function getDeviceSerial() {
    chrome.runtime.getPlatformInfo(async function (info) {
        if (!info.os.toLowerCase().includes('cros')) {
            if (debug === false) {
                console.log('Not cros and not debug');
                doNotSend = true;
            }
        }
    });

    try {
        chrome.enterprise.deviceAttributes.getDeviceSerialNumber(async deviceId => {
            data.serial = deviceId.toUpperCase();
            if (data.serial === '') {
                throw 'No Serial returned';
                if (debug === false) {
                    console.log('setting do not send to true due to no serial being returned and not being debug');
                    doNotSend = true;
                }
            }
        });
    } catch (err) {
        data.serial = 'abc123'.toUpperCase();
        console.log('Not a managed chrome device');
        if (debug === true) {
            console.log(err);
        }
        if (debug === false) {
            console.log('setting do not send to true due to no serial error and not being debug');
            doNotSend = true;
        }
    }
}

function getExtensionVersion() {
    chrome.runtime.getPackageDirectoryEntry(function (dirEntry) {
        dirEntry.getFile("manifest.json", undefined, function (fileEntry) {
            fileEntry.file(function (file) {
                var reader = new FileReader();
                reader.addEventListener("load", function (event) {
                    var manifest = JSON.parse(reader.result);
                    data.sal_version = manifest.version;
                    if (doNotSend == false) {
                        renderStatus('Running chromesal ' + data.sal_version);
                    }
                });
                reader.readAsText(file);
            });
        }, function (e) {
            console.log(e);
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

function getExtensions() {
    chrome.management.getAll(function (info) {
        if (appInventory != []) {
            info.forEach(function (extension) {
                var inventory_item = {};
                inventory_item.name = extension.name;
                inventory_item.bundleid = extension.id;
                inventory_item.version = extension.version;
                inventory_item.install_type = extension.installType;
                inventory_item.description = extension.description;
                appInventory.push(inventory_item);
            });
        }
        console.log('Extension list callback');
    });
}

function getSettings() {
    chrome.runtime.getPackageDirectoryEntry(function (dirEntry) {
        dirEntry.getFile("settings.json", undefined, function (fileEntry) {
            fileEntry.file(function (file) {
                var reader = new FileReader();
                reader.addEventListener("load", function (event) {
                    var settings = JSON.parse(reader.result);
                    console.log('Using local settings file');
                    console.log(settings.debug);
                    data.key = settings.key;
                    key = settings.key;
                    serverURL = settings.serverurl;
                    debug = settings.debug;
                    settingsSet = true;
                });
                reader.readAsText(file);
            });
        }, function (e) {
            console.log(e);
        });
    });
    chrome.storage.managed.get(null, function (adminConfig) {
        console.log("chrome.storage.managed.get adminConfig: ", adminConfig);
        data.key = adminConfig['key'];
        key = adminConfig['key'];
        serverURL = adminConfig['serverurl'];

        settingsSet = true;
    });
}

function notRunningMessage() {
    console.log('Not running on a managed device, not sending report');
    renderStatus('Only functional on a managed Chrome OS device');
    chrome.browserAction.setIcon({
        path: "./icons/inactive_128.png"
    });
}

function main() {
    getSettings();
    waitForSettings(function () {
        guid();
        getExtensionVersion();
        getDeviceSerial();
        getGoogleDeviceIdentifier();
        getDeviceName();
        getCPUInfo();
        getStorageInfo();
        getOsVersion();
        getMemInfo();
        getExtensions();
        getConsoleUser();

        continueExec();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    main();
});