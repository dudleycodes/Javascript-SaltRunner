//JSLint Settings
/*jslint indent: 4, maxerr: 200, passfail: false, white: false, browser: true, devel: false, windows: true, rhino: false, debug: true, evil: true, continue: false, forin: false, sub: false, css: false, todo: false, on: false, fragment: false, es5: false, vars: false, undef: false, nomen: true, node: false, plusplus: true, bitwise: true, regexp: false, newcap: true, unparam: false, sloppy: true, eqeq: true, stupid: false */
//

/**
 * @file Simple test (aka "salt") runner. This is a stop-gap until legal review of QUnit license is complete.
 */

var RESULT_NA = 100,                                //Result 'constants' - The higher the value the more severe the `failed` result is
    RESULT_PASS = 200,
    RESULT_UNKNOWN = 306,
    RESULT_FAIL = 400,
    RESULT_TIMEOUT = 408,
    RESULT_ERROR = 500,
    DUD = (DUD || {});                              //Ensure `DUD` namespace exists in global scope

var testScope = {},                                 //Ensure testScope namespace exists in the global scope
    DUD = (DUD || {});                              //Ensure `DUD` namespace exists in global scope
DUD.saltCollection = (DUD.saltCollection || []);

//IE8 lacks .trim() - to keep environment vanilla we don't extend String.prototype
var IE8 = (IE8 || {});
IE8.trim = (IE8.trim || function (string) {
    return (string.trim) ? string.trim() : string.replace(/^\s+|\s+$/g, '');
});

var SaltRunner = function () {
    if (SaltRunner.prototype._singletonInstance) {
        return SaltRunner.prototype._singletonInstance;
    }
    SaltRunner.prototype._singletonInstance = this;

    this.debugMode = true;

    //HTML output settings
    this.settingOutputDiv = "saltRunnerOutputDiv";
    this.settingProgressDiv = "saltRunnerCounterDiv";

    //Behaviour settings
    this.settingHaltOnError = true;
    this.settingShowPassingGroDUD = true;
    this.settingShowPassingTests = false;
    this.settingShowSaltResultLabel = false;
    this.validAssertions = ['empty', 'equals', 'executes', 'fail', 'false', 'notEmpty', 'notEquals', 'strictEquals',
        'strictNotEquals', 'throws', 'true'];
};

SaltRunner.prototype.assertBoolean = function (executionCode, booleanValue) {
    booleanValue = !!booleanValue;

    var actualValue,
        code = RESULT_UNKNOWN,
        html = "";

    try {
        actualValue = this.executeCode(executionCode);
        if (actualValue === booleanValue) {
            code = RESULT_PASS;
        } else {
            code = RESULT_FAIL;
            html = "Expected boolean value '" + String(booleanValue).toUpperCase()
                    + "' but received '" + this.humanFriendlyValue(actualValue) + "'.";
        }
    } catch (err) {
        code = RESULT_ERROR;
        html = this.humanFriendlyException(err);
    }

    return { 'actual': actualValue, 'code': code, 'html': html };
};

/**
 * Determines if executionCode returns an empty result (undefined, null, "", false, or "0"
 * @param {function | string} [executionCode] - Code to be executed.
 * @returns {object}
 * @example ['empty', 'salt description', 'return 3;'] //FAILS
 * ['empty', 'salt description', 'var a = 42;'] //PASSES
 */
SaltRunner.prototype.assertEmpty = function (executionCode) {
    var actualValue,
        code = RESULT_UNKNOWN,
        html = "";

    try {
        actualValue = this.executeCode(executionCode);
        if (!actualValue && actualValue !== null) {
            code = RESULT_PASS;
        } else {
            code = RESULT_FAIL;
            html = "Expected an empty value but received '" + this.humanFriendlyValue(actualValue) + "'.";
        }
    } catch (err) {
        code = RESULT_ERROR;
        html = this.humanFriendlyException(err);
    }

    return { 'actual': actualValue, 'code': code, 'html': html };
};

/**
 * Determines if executionCode result equals an expected value
 * @param {function | string} [executionCode] - Code to be executed.
 * @param [expectedValue] - Expected value.
 * @param {boolean} [bolStrict] - Determines if equality check should be strict ("===").
 * @returns {object}
 * @example ['equals', 'description', 'return 3;',4]    //FAILS
 * ['equals', 'description', 'return 3;',3]             //PASSES
 * ['strictEquals', 'description','return 3',"3"]       //FAILS
 * ['strictEquals', 'description', 'return 3',3]        //PASSES
 */
SaltRunner.prototype.assertEquals = function (executionCode, expectedValue, bolStrict) {
    bolStrict = !!bolStrict;

    var actualValue,
        code = RESULT_UNKNOWN,
        html = "",
        i = 0,
        objectsAreSame,
        temp;

    objectsAreSame = function (x, y) {
        var bolReturnValue = true,
            propertyName = "";

        for (propertyName in x) {
            if (x.hasOwnProperty(propertyName)) {
                x = x[propertyName];
                y = y[propertyName];

                if ((bolStrict && x !== y) || x != y) {
                    if (typeof x !== 'object' || x === null || y === null || !objectsAreSame(x, y)) {
                        bolReturnValue = false;
                        break;
                    }
                }
            }
        }
        return bolReturnValue;
    };

    try {
        actualValue = this.executeCode(executionCode);

        if (typeof expectedValue === 'string' && actualValue != expectedValue) {
            try {
                temp = this.executeCode(expectedValue);
            } catch (err) {
                i = false;
            } finally {
                if (i !== false) {
                    expectedValue = temp;
                }
            }
        }

        if (Object.prototype.toString.call(actualValue) === '[object Array]'
                || Object.prototype.toString.call(expectedValue) === '[object Array]') {
            if (Object.prototype.toString.call(actualValue) === '[object Array]'
                    && Object.prototype.toString.call(expectedValue) === '[object Array]'
                    && actualValue.length === expectedValue.length) {           //IE < 10 is a "fun"
                code = RESULT_PASS;
                for (i = 0; i < actualValue.length; ++i) {
                    if ((!bolStrict && actualValue[i] != expectedValue[i]) || actualValue[i] !== expectedValue[i]) {
                        code = RESULT_FAIL;
                        break;
                    }
                }
            } else {
                code = RESULT_FAIL;
            }
        } else if (actualValue === expectedValue || (!bolStrict && actualValue == expectedValue)) {
            code = RESULT_PASS;
        } else if (actualValue && typeof actualValue === 'object'
                && expectedValue && typeof expectedValue === 'object') {
            code = (objectsAreSame(expectedValue, actualValue)) ? RESULT_PASS : RESULT_FAIL;
        }

        if (code > RESULT_PASS) {
            if (code === RESULT_UNKNOWN) { code = RESULT_FAIL; }
            if (bolStrict) {
                html = "Strictly expected '" + this.humanFriendlyValue(expectedValue) + "' (" + (typeof expectedValue)
                    + ") but received '" + this.humanFriendlyValue(actualValue) + "' (" + (typeof actualValue) + ").";
            } else {
                html = "Expected '" + this.humanFriendlyValue(expectedValue)
                    + "' but received '" + this.humanFriendlyValue(actualValue) + "'.";
            }
        }
    } catch (err2) {
        code = RESULT_ERROR;
        html = this.humanFriendlyException(err2);
    }

    return { 'actual': actualValue, 'code': code, 'html': html };
};


/**
 * Assertion "Executes" - Determines if code can be executed without throwing an exception.
 * @param {string} [workbookName=this.getSelectedWorkbook()] - The name of the parent workbook.
 * @returns {object} result {code, html}
 * @example ['executes', 'check that code executes', 'window.alert("test");']
 */
SaltRunner.prototype.assertExecutes = function (executionCode) {
    var actualValue,
        code = RESULT_UNKNOWN,
        html = "";

    if (!executionCode) {
        code = RESULT_NA;
    } else {
        try {
            actualValue = this.executeCode(executionCode);
            code = RESULT_PASS;
        } catch (err) {
            actualValue = err;
            code = RESULT_ERROR;
            html = this.humanFriendlyException(err);
        }
    }

    return { 'actual': actualValue, 'code': code, 'html': html };
};

SaltRunner.prototype.assertNotEmpty = function (executionCode) {
    var code = RESULT_UNKNOWN,
        html = "",
        result = this.assertEmpty(executionCode);

    if (result.code === RESULT_FAIL) {
        code = RESULT_PASS;
    } else if (result.code == RESULT_PASS) {
        code = RESULT_FAIL;
        html = "Expected a non-empty value but received '" + this.humanFriendlyValue(result.actual) + "'.";
    } else {
        code = result.code;
        html = result.html;
    }
    return { 'actual': result.actual, 'code': code, 'html': html };
};

SaltRunner.prototype.assertNotEquals = function (executionCode, unexpected, bolStrict) {
    bolStrict = !!bolStrict;

    var code = RESULT_UNKNOWN,
        html = "",
        result = {};

    //Let's take the result from assertEquals() and "invert" it
    result = this.assertEquals(executionCode, unexpected, bolStrict);
    if (result.code === RESULT_FAIL) {
        code = RESULT_PASS;
    } else if (result.code <= RESULT_PASS) {
        code = RESULT_FAIL;

        if (bolStrict) {
            html = "Did not strictly expect '" + this.humanFriendlyValue(result.actual) + "' (" + (typeof result.actual) + ").";
        } else {
            html = "Did not expect '" + this.humanFriendlyValue(result.actual) + "'.";
        }
    } else {
        code = result.code;
        html = result.html;
    }

    return { 'actual': result.actual, 'code': code, 'html': html };
};

SaltRunner.prototype.assertThrows = function (executionCode, exceptionName) {
    exceptionName = String(exceptionName).replace(/^\s+|\s+$/g, '');

    var actualName = "",
        code = RESULT_UNKNOWN,
        html = "";

    try {
        this.executeCode(executionCode);
        code = RESULT_FAIL;
        html = "Expected exception '" + exceptionName + "' but none were thrown.";
    } catch (err) {
        actualName = String(err.name);
        if (actualName.toLowerCase() === exceptionName.toLowerCase()) {
            code = RESULT_PASS;
        } else {
            code = RESULT_FAIL;
            html = "Expected exception '" + exceptionName + "' but received exception '" + actualName + "'.";
        }
    }
    
    return {'actual': actualName, 'code': code, 'html': html};
};

SaltRunner.prototype.executeCode = function (executionCode) {
    if (executionCode !== undefined) {
        //Run in a deeper scope
        return (function (executionCode) {
            var isFunction = false,
                returnValue;

            isFunction = !!(executionCode && {}.toString.call(executionCode) === '[object Function]');
            if (isFunction) {
                returnValue = executionCode();
            } else {
                returnValue = eval(executionCode);
            }
            return returnValue;
        }(executionCode));
    }
};

SaltRunner.prototype.getSaltURL = function (url) {
    var returnValue;
    if (url) {
        returnValue = String(url) + "?preventCaching="
            + (new Date().getTime()) + Math.floor((Math.random() * 999) + 1);
    }
    return returnValue;
};


SaltRunner.prototype.humanFriendlyException = function (objExcetion) {
    return objExcetion.name + " - '" + (objExcetion.message || objExcetion.description) + "'.";
};

SaltRunner.prototype.humanFriendlyValue = function (obj) {
    if (obj === null) {
        obj = "null";
    } else if (obj === false) {
        obj = "{false}";
    } else if (obj === true) {
        obj = "{true}";
    } else if (typeof obj === 'object' && typeof JSON.stringify === 'function') {
        obj = JSON.stringify(obj);
    } else {
        obj = String(obj);
    }
    return obj;
};

SaltRunner.prototype.isSalt = function (obj) {
    var bolReturnValue = false;

    if (Object.prototype.toString.call(obj) === '[object Array]') {
        if (this.isValidAssertion(obj[0]) && (typeof obj[1] === "string" || obj[1] instanceof String)) {
            bolReturnValue = true;
        }
    }

    return bolReturnValue;
};

SaltRunner.prototype.isSaltCollection = function (obj) {
    var bolReturnValue = false;

    if (Object.prototype.toString.call(obj) === '[object Array]') {
        if (this.isSalt(obj[0]) || this.isSaltGroup(obj[0])) {
            bolReturnValue = true;
        }
    }

    return bolReturnValue;
};

SaltRunner.prototype.isSaltGroup = function (obj) {
    var bolReturnValue = false;

    if (!this.isSalt(obj)) {
        if (obj && obj.name && (typeof obj.name === "string" || obj.name instanceof String)
                && Object.prototype.toString.call(obj.salts) === '[object Array]') {
            return true;
        }
    }

    return bolReturnValue;
};

SaltRunner.prototype.isScalar = function (obj) {
    return (/string|number|boolean/).test(typeof obj);
};

SaltRunner.prototype.isValidAssertion = function (assertion) {
    var bolReturnValue = false,
        i = 0,
        validAssertionCount = this.validAssertions.length;

    assertion = String(assertion).toLowerCase();

    for (i = 0; i < validAssertionCount; i++) {             //IE8 doesn't support indexOf() :'(
        if (assertion  === String(this.validAssertions[i]).toLowerCase()) {
            bolReturnValue = true;
            break;
        }
    }

    return bolReturnValue;
};

SaltRunner.prototype.outputHTML = function (html, bolClearPrevious) {
    if (bolClearPrevious) { document.getElementById(this.settingOutputDiv).innerHTML = ""; }

    document.getElementById(this.settingOutputDiv).innerHTML += html;
    return true;
};

SaltRunner.prototype.run = function (jsonFiles) {
    var getClass,
        i = 0,
        result = {},
        runSalts,
        saltsExecuted = 0,
        saltObj = null,
        saltsSuccessful = 0,
        xhr;

    getClass = function (code) {
        var returnValue;

        switch (code) {
        case RESULT_NA:
            returnValue = 'class="group"';
            break;
        case RESULT_ERROR:
            returnValue = 'class="error"';
            break;
        case RESULT_FAIL:
            returnValue = 'class="fail"';
            break;
        case RESULT_PASS:
            returnValue = 'class="pass"';
            break;
        case RESULT_TIMEOUT:
            returnValue = 'class="timeout"';
            break;
        default:
            returnValue = 'class="unknown"';
        }

        return returnValue;
    };

    runSalts = function (saltObj, recursionDepth) {
        recursionDepth = (recursionDepth || 0);

        var code = 0,
            i = 0,
            html = "",
            prevFlagValues = [],
            result,
            temp = null,
            that = SaltRunner.prototype._singletonInstance;

        if (that.isSalt(saltObj)) {                         //Run a single "salt"
            saltsExecuted++;
            result = that.runSalt(saltObj);
            code = result.code;
            html = "<li " + getClass(result.code) + ">" + result.html + "</li>";
            if (code === RESULT_PASS) {
                if (!that.settingShowPassingTests) { html = ""; }
                saltsSuccessful++;
            }
            that.setRunStatus(saltsSuccessful, saltsExecuted);
        } else if (that.isSaltCollection(saltObj)) {        //Run an array of salts
            for (i = 0; i < saltObj.length; ++i) {
                result = runSalts(saltObj[i], recursionDepth++);
                if (result.code > code) { code = result.code; }
                html += result.html;
                if (code >= 500 && that.settingHaltOnError) { break; }
            }
            if (html.length > 0) { html = '<ul>' + html + '</ul>'; }
        } else if (that.isSaltGroup(saltObj)) {         //Run a salt group
            temp = that.assertExecutes(saltObj.setupCode);
            if (temp.code > RESULT_PASS) {
                //If setup code exists & failed don't run subsequent salts
                result = temp;
                result.html = '<li ' + getClass(result.code) + '>Setup code: ' + result.html + '</li>';
            } else {
                //Run saltGroup's salt collection & get result
                result = runSalts(saltObj.salts, recursionDepth++);
            }

            if (that.settingShowPassingGroDUD || result.code !== RESULT_PASS || that.settingShowPassingTests) {
                html = '<li ' + getClass(result.code) + '>' + saltObj.name + '<ul>' + result.html + '</ul>';
            }

            //run tear down code
            if (saltObj.setupCode) {
                temp = that.assertExecutes(saltObj.teardownCode);
                if (temp.code > RESULT_PASS) {
                    result.html += '<li>Tear-Down code failed to execute - ' + temp.html + '!</li>';
                    if (temp.code > result.code) { result.code = temp.code; }
                }
            }

            code = result.code;
        }

        return {"code": code, "html": html};
    };

    this.outputHTML('Retrieving salts...', true);
    xhr = new XMLHttpRequest();
    DUD.saltMasterCollection = [];
    DUD.saltMasterCount = jsonFiles.length;

    xhr.onreadystatechange = function () {
        var temp;
        if (xhr.readyState === 4 && (xhr.status === 200 ||  xhr.status === 0)) {
            try {
                temp = JSON.parse(String(xhr.responseText));
                DUD.saltMasterCollection.push(temp);
            } catch (err) {
                DUD.saltMasterCollection.push(
                    ["fail", "Invalid JSON - cannot process " + jsonFiles[DUD.saltMasterCollection.length]]
                );
            }

            if (DUD.saltMasterCount === DUD.saltMasterCollection.length) {
                SaltRunner.prototype._singletonInstance.outputHTML('Processing salts...', true);
                setTimeout(function () {        //Need delay so UI updates
                    temp = runSalts(DUD.saltMasterCollection);
                    SaltRunner.prototype._singletonInstance.outputHTML(temp.html, true);
                }, 60);
            } else {
                temp = SaltRunner.prototype._singletonInstance.getSaltURL(jsonFiles[DUD.saltMasterCollection.length]);
                if (SaltRunner.prototype._singletonInstance.debugMode) {
                    console.log("SaltRunner: Retrieving '" + temp + "'");
                }
                xhr.open("GET", temp, true);
                xhr.send();
            }
        }
    };

    if (jsonFiles.length > 0) {
        temp = this.getSaltURL(jsonFiles[0]);
        if (this.debugMode) {
            console.log("SaltRunner: Retrieving '" + temp + "'");
        }
        xhr.open("GET", temp, true);
        xhr.send();
    }
};

SaltRunner.prototype.runSalt = function (salt) {
    var assertionName = String(salt[0]).toLowerCase().replace(/^\s+|\s+$/g, ''),        //IE8 has no .trim()
        description = salt[1],
        executionCode = salt[2],
        result = {},
        returnHTML = "";

    if (this.isSalt(salt)) {
        switch (assertionName) {
        case 'empty':
            result = this.assertEmpty(executionCode);
            break;
        case 'equals':
        case 'strictequals':
            result = this.assertEquals(executionCode, salt[3], !!(assertionName === 'strictequals'));
            break;
        case 'executes':
            result = this.assertExecutes(executionCode);
            break;
        case 'fail':
            result = { "code": RESULT_FAIL, "html": executionCode };
            break;
        case 'false':
        case 'true':
            result = this.assertBoolean(executionCode, !!(assertionName === 'true'));
            break;
        case 'notempty':
            result = this.assertNotEmpty(executionCode);
            break;
        case 'notequals':
        case 'strictnotequals':
            result = this.assertNotEquals(executionCode, salt[3], !!(assertionName === 'strictnotequals'));
            break;
        case 'throws':
            result = this.assertThrows(executionCode, salt[3]);
            break;
        default:
            throw "Invalid assertion!";
        }
    } else {
        throw "Not a valid salt!";
    }

    if (this.settingShowSaltResultLabel) {
        if (result.code <= RESULT_PASS) {
            returnHTML = 'PASS - ';
        } else if (result.code <= RESULT_FAIL) {
            returnHTML = 'FAIL - ';
        } else {
            returnHTML = 'ERROR - ';
        }
    }
    returnHTML += description;
    if (result.html) { returnHTML += ' - ' + result.html; }

    return {'actual': result.actual, 'code': result.code, 'html': returnHTML};
};

SaltRunner.prototype.setRunStatus = function (succesfullCount, totalCount) {
    var className = 'bad',
        html = '',
        percentage = (succesfullCount / totalCount),
        temp = Math.round(percentage * 10000) / 100;

    succesfullCount = parseInt(succesfullCount, 10);
    totalCount = parseInt(totalCount, 10);

    if (totalCount < 1) {
        html = '<h2>No tests executed!<h2>';
    } else if (percentage === 1) {
        className = 'good';
        html = '<h2>100% -- All tests passed!<h2>';
    } else {
        percentage = (temp === 1) ? 99.9 : temp;
        html = '<h2>' + percentage + '% -- ' + (totalCount - succesfullCount) + ' out of '
            + succesfullCount + ' tests failed.</h2>';
    }

    if (document.getElementById(this.settingProgressDiv)) {
        document.getElementById(this.settingProgressDiv).innerHTML = html;
        document.getElementById(this.settingProgressDiv).className = className;
        document.getElementById(this.settingProgressDiv).style.margin = 4;
        document.getElementById(this.settingProgressDiv).style.padding = 4;
        document.getElementById(this.settingProgressDiv).style.textAlign = 'center';
    }
};
