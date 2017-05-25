# CHANGELOG

Dates use DD/MM/YYYY format.

## 2.0.0 - 24/05/17
* Increase performance by approximately 10x due to use of `pixl-xml` and
improved algorithm for getting weather nodes.
* Simplify codebase.
* Update JSON output format to be closer to the original XML content. This gives
users of this module more flexibility and information but is a breaking change.
* Add `getValidTimes` function.
* Fix security `request` and `qs` module vulnerabilities by updating to `yr.no-interface@1.0.1`.

## 1.0.1 - 28/04/2017
* Mitigate security vulnerabilities.
* Use new yr.no-interface@1.0.0 internally.

## 1.0.0 - 27/04/2017
* Change to Promise based interface.
* Make the module a factory function.
* Use `pixl-xml` to increase XML parsing speed and lower memory usage. Yay for
better performance!
* Improved unit tests. Tests no longer require an internet connection.
* Removed `getCurrentSummary` in favour of simply using `getForecastForTime` and
passing the current timestamp. Simplifies API footprint.


## < 1.0.0
* Undocumented. Sorry.
