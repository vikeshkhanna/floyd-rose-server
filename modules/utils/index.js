module.exports.clone = function(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = {};

    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = Utils.clone(obj[attr]);
    }
    return copy;
}
