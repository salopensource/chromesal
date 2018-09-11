alarmPeriod = Math.floor(Math.random() * 29);

chrome.alarms.create('salAlarm', {
    delayInMinutes: 1,
    periodInMinutes: alarmPeriod
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'salAlarm') {
       main();
    }
});