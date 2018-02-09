# ChromeSal

ChromeSal is an extension for Chrome OS that allows Managed Chrome devices to report to a Sal server.

## Requirements

* The Chrome OS device _must_ be enterprise enrolled.
* The extension _must_ be installed via the G-Suite policy

The extension has been restricted to Chrome OS devices only, and will not function if the above two conditions are not met.

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



## Credits
https://github.com/pugetive/plist_parser
Icon: Monitor by Astonish from the Noun Project
