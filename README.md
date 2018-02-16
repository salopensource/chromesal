# ChromeSal

ChromeSal is an extension for Chrome OS that allows Managed Chrome devices to report to a Sal server.

## Requirements

* The Chrome OS device _must_ be enterprise enrolled.
* The extension _must_ be installed via the G-Suite policy

The extension has been restricted to Chrome OS devices only, and will not function if the above two conditions are not met. This extension relies on APIs that are only available to enterprise enrolled devices, so does not function when installed manually.

## Configuration

``` json
{
  "serverurl": {
    "Value": "https://sal.yourcompany.com"
  },

  "key": {
    "Value": "yourreallyreallyreallylongkey"
  }
}
```

You must apply the above configuration file using G-Suite admin.

## Contributing

If you wish to contribute to ChromeSal, please file an issue or (even better) a pull request to fix things. If you wish to talk about your feature before implementing, you will find the maintainers in [#sal](https://macadmins.slack.com/messages/C061B9XGS) on the macadmins.org Slack.

If you wish to run the code locally (via Chrome's 'unpacked extension' feature), you can place a file called `settings.json` in the same directory as the source code, with the following contents:

``` json
{
  "debug": false,
  "serverurl": "https://sal.company.com",
  "key": "yourreallylongkey"
}
```

If you wish to test on a non-enterprise enrolled / non-chrome OS device, set `debug` to `true`. Note that this will produce the serial number of `ABC123`, as the device's Cloud ID is not avaialble to non-enterprise enrolled devices.


## Credits
https://github.com/pugetive/plist_parser
Icon: Monitor by Astonish from the Noun Project
