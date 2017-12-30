chrome.alarms.create('salAlarm', {
    delayInMinutes: 0,
    periodInMinutes: 20
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'salAlarm') {
       main();
    }
});