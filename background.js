function objectToPlist(obj) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml +=
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';
  xml += '<plist version="1.0">';

  function serialize(value) {
    if (Array.isArray(value)) {
      xml += "<array>";
      value.forEach((item) => {
        serialize(item);
      });
      xml += "</array>";
    } else if (typeof value === "object" && value !== null) {
      xml += "<dict>";
      for (const [key, val] of Object.entries(value)) {
        xml += `<key>${key}</key>`;
        serialize(val);
      }
      xml += "</dict>";
    } else if (typeof value === "string") {
      xml += `<string>${value}</string>`;
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        xml += `<integer>${value}</integer>`;
      } else {
        xml += `<real>${value}</real>`;
      }
    } else if (typeof value === "boolean") {
      xml += value ? "<true/>" : "<false/>";
    } else if (value instanceof Date) {
      xml += `<date>${value.toISOString()}</date>`;
    } else {
      xml += "<string></string>"; // Handle other types as empty strings
    }
  }

  serialize(obj);
  xml += "</plist>";
  return xml;
}

var min = 5;
var max = 30;

function logDebug(message) {
  if (debug) {
    console.log(message);
  }
}

var alarmPeriod = Math.floor(Math.random() * (max - min)) + min;
console.log("Alarm period is " + alarmPeriod);
chrome.runtime.onInstalled.addListener(() => {
  logDebug("Background service started.");
});

self.addEventListener("activate", (event) => {
  logDebug("Service worker activated");
  main();
});

// Set up the alarm when the service worker is installed or restarted
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("submitData", { periodInMinutes: alarmPeriod });
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "submitData") {
    logDebug("Alarm fired!");
    main();
  }
});

// Set up some globals
var debug = false;
var data = {};
data.sal_version = "";
var report = {};
report.MachineInfo = {};
report.MachineInfo.HardwareInfo = {};
var doNotSend = false;
var appInventory = [];
var settingsSet = false;

var key = "";
var serverURL = "";

function renderStatus(statusText) {
  try {
    document.getElementById("status").textContent = statusText;
  } catch (err) {
    console.log(statusText);
  }
}

function sendBackDeviceName(device_name) {
  if (device_name) {
    data.name = device_name;
  } else {
    data.name = "Chrome OS Device";
  }
}

function getDeviceName() {
  try {
    chrome.enterprise.deviceAttributes.getDeviceSerialNumber(
      sendBackDeviceName
    );
  } catch (err) {
    data.name = "Chrome OS Device";
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
  var cpu_array = info.modelName.split("@");
  report.MachineInfo.HardwareInfo.cpu_type = cpu_array[0].trim();
  if (report.MachineInfo.HardwareInfo.cpu_type.endsWith("CPU ")) {
    report.MachineInfo.HardwareInfo.cpu_type = report.MachineInfo.HardwareInfo.cpu_type
      .slice(0, -4)
      .trim();
  }
  report.MachineInfo.HardwareInfo.current_processor_speed = cpu_array[1].trim();
}

function getOsVersion() {
  var userAgentString = navigator.userAgent;
  if (/Chrome/.test(userAgentString)) {
    report.MachineInfo.os_vers = userAgentString.match(
      "Chrome/([0-9]*.[0-9]*.[0-9]*.[0-9]*)"
    )[1];
  } else {
    report.MachineInfo.os_vers = "UNKNOWN";
  }
}

function sendBackStorageInfo(info) {
  if (info.length === 0) {
    data.disk_size = "1";
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
  report.MachineInfo.HardwareInfo.physical_memory =
    (info.capacity / 1000000000).toFixed(2) + " GB";
}

function guid() {
  data.run_uuid =
    s4() +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    s4() +
    s4();
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
    logDebug("Waiting for data");
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

  plistroot = removeDuplicates(plistroot, "bundleid");
  logDebug(JSON.stringify(plistroot));

  return objectToPlist(plistroot);
}

function addManagedInstalls(report, appInventory) {
  report.ManagedInstalls = {};
  appInventory.forEach(function (extension) {
    if (extension.install_type == "admin") {
      report.ManagedInstalls[extension.name] = {
        status: "PRESENT",
        data: {
          type: "Extension",
        },
      };
    }
  });

  return report;
}

function checkForData() {
  if (data.key === "") {
    return false;
  }

  if (data.serial === "") {
    return false;
  }

  if (serverURL === "") {
    return false;
  }

  if (data.sal_version === "") {
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
    serial: data.serial,
    hostname: data.serial,
    console_user: data.username,
    os_family: report.os_family,
    operating_system: report.MachineInfo.os_vers,
    hd_space: report.AvailableDiskSpace,
    cpu_type: report.MachineInfo.cpu_type,
    cpu_speed: report.MachineInfo.current_processor_speed,
    memory: report.MachineInfo.HardwareInfo.physical_memory,
  };

  out.Machine.extra_data = new_report;
  out.Chrome.managed_items = report.ManagedInstalls;
  out.Sal = {};
  out.Chrome.facts = { checkin_module_version: data.sal_version };
  out.Sal.facts = { checkin_module_version: data.sal_version };
  out.Machine.facts = {
    checkin_module_version: data.sal_version,
    google_device_id: data.google_device_identifier,
  };
  out.Sal.extra_data = { key: data.key, sal_version: data.sal_version };
  return out;
}

function sendData() {
  report.os_family = "ChromeOS";
  report = addManagedInstalls(report, appInventory);

  var reportJson = JSON.stringify(sal4ReportFormat(report));
  logDebug(reportJson);
  logDebug(appInventory);
  var inventoryPlist = buildInventoryPlist(appInventory);
  logDebug(inventoryPlist);
  fetch(serverURL + "/checkin/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa("sal:" + key),
    },
    body: reportJson,
  })
    .then((response) => response.text())
    .then((received) => {
      console.log(received);
      data.base64inventory = btoa(unescape(encodeURIComponent(inventoryPlist)));
      logDebug(data);
      return fetch(serverURL + "/inventory/submit/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa("sal:" + key),
        },
        body: new URLSearchParams(data).toString(),
      });
    })
    .then((response) => response.text())
    .then((received) => {
      console.log(received);
    })
    .catch((error) => {
      console.log(error);
    });
}

async function getGoogleDeviceIdentifier() {
  chrome.runtime.getPlatformInfo(async function (info) {
    if (!info.os.toLowerCase().includes("cros")) {
      if (debug === false) {
        console.log("Not cros and not debug");
        doNotSend = true;
      }
    }
  });

  try {
    chrome.enterprise.deviceAttributes.getDirectoryDeviceId(
      async (google_deviceId) => {
        data.google_device_identifier = google_deviceId.toUpperCase();
        if (data.google_device_identifier === "") {
          throw "No Google Identifier returned";
          if (debug === false) {
            console.log(
              "setting do not send to true due to no serial being returned and not being debug"
            );
            doNotSend = true;
          }
        }
      }
    );
  } catch (err) {
    data.google_device_identifier = "abc123".toUpperCase();
    console.log("Not a managed chrome device");
    if (debug === true) {
      console.log(err);
    }
    if (debug === false) {
      console.log(
        "setting do not send to true due to no serial error and not being debug"
      );
      doNotSend = true;
    }
  }
}

async function getDeviceSerial() {
  chrome.runtime.getPlatformInfo(async function (info) {
    if (!info.os.toLowerCase().includes("cros")) {
      if (debug === false) {
        console.log("Not cros and not debug");
        doNotSend = true;
      }
    }
  });

  try {
    chrome.enterprise.deviceAttributes.getDeviceSerialNumber(
      async (deviceId) => {
        data.serial = deviceId.toUpperCase();
        if (data.serial === "") {
          throw "No Serial returned";
          if (debug === false) {
            console.log(
              "setting do not send to true due to no serial being returned and not being debug"
            );
            doNotSend = true;
          }
        }
      }
    );
  } catch (err) {
    data.serial = "abc123".toUpperCase();
    console.log("Not a managed chrome device");
    if (debug === true) {
      console.log(err);
    }
    if (debug === false) {
      console.log(
        "setting do not send to true due to no serial error and not being debug"
      );
      doNotSend = true;
    }
  }
}

function getExtensionVersion() {
  // Get the URL of the manifest.json file
  const manifestUrl = chrome.runtime.getURL("manifest.json");

  // Use fetch to get the manifest file
  fetch(manifestUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((manifest) => {
      data.sal_version = manifest.version;
      if (doNotSend == false) {
        renderStatus("Running chromesal " + data.sal_version);
      }
    })
    .catch((error) => {
      console.error("Error fetching manifest:", error);
    });
}

function removeDuplicates(arr, prop) {
  let obj = {};
  return Object.keys(
    arr.reduce((prev, next) => {
      if (!obj[next[prop]]) obj[next[prop]] = next;
      return obj;
    }, obj)
  ).map((i) => obj[i]);
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
    console.log("Extension list callback");
  });
}

function getSettings() {
  const settingsUrl = chrome.runtime.getURL("settings.json");

  fetch(settingsUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.text();
    })
    .then((text) => {
      var settings = JSON.parse(text);
      console.log("Using local settings file");
      data.key = settings.key;
      key = settings.key;
      serverURL = settings.serverurl;
      debug = settings.debug;
      settingsSet = true;
    })
    .catch((e) => {
      console.log(e);
    });

  chrome.storage.managed.get(null, function (adminConfig) {
    console.log("chrome.storage.managed.get adminConfig: ", adminConfig);
    data.key = adminConfig["key"];
    key = adminConfig["key"];
    serverURL = adminConfig["serverurl"];

    settingsSet = true;
  });
}

function notRunningMessage() {
  console.log("Not running on a managed device, not sending report");
  renderStatus("Only functional on a managed Chrome OS device");
  chrome.browserAction.setIcon({
    path: "./icons/inactive_128.png",
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
