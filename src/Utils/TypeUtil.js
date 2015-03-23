function isType(type) {
    return function(obj) {
        return {}.toString.call(obj) == "[object " + type + "]";
    };
}

exports.isType = isType;
exports.isObject = isType("Object");
exports.isFunction = isType("Function");
exports.isString = isType("String");
exports.isArray = isType("Array");