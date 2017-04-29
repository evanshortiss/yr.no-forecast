# CHANGELOG

Dates use DD/MM/YYYY format.

## 2.0.0 TBD
* Significantly increase performance.
* Simplify code.
* Update output format to be closer to the original XML. This gives users of
this module more flexibility and information.

## 1.0.1 27/04/2017
* Mitigate security vulnerabilities.
* Use new yr.no-interface@1.0.0 internally.

## 1.0.0 26/04/2017
* Change to Promise based interface.
* Make the module a factory function.
* Use `pixl-xml` to increase XML parsing speed and lower memory usage. Yay for
better performance!
* Improved unit tests. Tests no longer require an internet connection.
* Removed `getCurrentSummary` in favour of simply using `getForecastForTime` and
passing the current timestamp. Simplifies API footprint.


## < 1.0.0
* Undocumented. Sorry.
