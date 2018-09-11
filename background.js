var min=20;
var max=30;
var alarmPeriod = Math.floor(Math.random() * (+max - +min)) + +min;

chrome.alarms.create('salAlarm', {
    delayInMinutes: 1,
    periodInMinutes: alarmPeriod
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'salAlarm') {
       main();
    }
});